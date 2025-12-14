import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import KnowledgeBase from "../models/KnowledgeBase.js";
import Course from "../models/Course.js";
import AppError from "../utils/app.error.js";
import { OPENAI_API_KEY, GEMINI_API_KEY } from "../utils/constants.js";

// --- OpenAI Client (Primary for Complex Generation) ---
const chatModel = new ChatOpenAI({
    openAIApiKey: OPENAI_API_KEY,
    modelName: "gpt-4-turbo-preview",
    temperature: 0.2,
});

// --- Gemini Embeddings (768 dimensions) ---
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: GEMINI_API_KEY,
    modelName: "text-embedding-004",
});

// --- Gemini Client (Support + Fallback) ---
let geminiModel;
if (GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

class RagService {

    async callGemini(prompt, isJson = false) {
        if (!geminiModel) throw new Error("GEMINI_API_KEY is invalid or missing.");
        const generationConfig = isJson ? { responseMimeType: "application/json" } : {};
        const result = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });
        const response = await result.response;
        return response.text();
    }

    async handleSupportQuery(query) {
        let queryEmbedding;
        try {
            queryEmbedding = await embeddings.embedQuery(query);
        } catch (error) {
            console.warn("Gemini Embedding Failed. Falling back to simple answers.");
            try {
                return await this.callGemini(`You are El Mister support. Answer politely: "${query}"`);
            } catch (e) {
                return "Support AI unavailable.";
            }
        }

        const results = await KnowledgeBase.aggregate([
            {
                $vectorSearch: {
                    queryVector: queryEmbedding,
                    path: "embedding",
                    numCandidates: 100, // Increased for smaller dims often helps
                    limit: 3,
                    index: "default",
                },
            },
            {
                $project: {
                    question: 1,
                    answer: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
        ]);

        const context = results.map((doc) => `Q: ${doc.question}\nA: ${doc.answer}`).join("\n---\n");

        if (!context) {
            return this.callGemini(`You are El Mister support. User question: "${query}". No context found. Answer politely.`);
        }

        const systemPrompt = `You are the official support agent for El Mister. Answer strictly based on the provided context. If the answer is not in the context, direct them to 'support@elmister.com'. Be polite and concise.
        
        Context:
        ${context}
        
        Question: ${query}`;
        return this.callGemini(systemPrompt);
    }

    async handleCourseBuilder(topic, userDetails = {}) {
        const regex = new RegExp(topic, "i");
        const marketCourses = await Course.find({
            $or: [{ title: regex }, { description: regex }, { tags: regex }],
        }).select("price title").limit(5);

        let marketStats = "No courses found.";
        let avgPrice = 0;
        if (marketCourses.length > 0) {
            const prices = marketCourses.map((c) => c.price);
            avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            marketStats = `Found ${marketCourses.length} similar. Avg Price: $${avgPrice.toFixed(2)}.`;
        }

        const prompt = `You are an expert Course Creator for "El Mister". Topic: "${topic}". Market: ${marketStats}. Output JSON: { "suggestedTitle": "str", "suggestedPrice": number, "modules": ["str"], "reasoning": "str" }`;

        try {
            const response = await chatModel.invoke([["system", "JSON output only."], ["human", prompt]]);
            try { return JSON.parse(response.content); }
            catch { return JSON.parse(response.content.replace(/```json|```/g, "").trim()); }
        } catch (error) {
            console.warn("OpenAI Failed. Fallback to Gemini.");
            try {
                const text = await this.callGemini(prompt, true);
                return JSON.parse(text);
            } catch {
                throw AppError.internal("AI services failed.");
            }
        }
    }

    async extractCourseDetails(prompt) {
        const subjects = await Course.distinct("subject");
        const subjectList = subjects.length > 0 ? subjects.join(", ") : "General";
        const { GRADE_LEVELS } = await import("../utils/constants.js");

        const systemPrompt = `Course Architect. Extract details. Output JSON: { "title": "str", "subTitle": "str", "description": "str", "price": number, "subject": "str", "gradeLevel": "str", "tags": ["str"] }
        Allowed Subjects: [${subjectList}]
        Allowed Grades: [${GRADE_LEVELS.join(", ")}]
        User Input: "${prompt}"`;

        try {
            const response = await chatModel.invoke([["system", "JSON only."], ["human", systemPrompt]]);
            try { return JSON.parse(response.content); }
            catch { return JSON.parse(response.content.replace(/```json|```/g, "").trim()); }
        } catch (error) {
            console.warn("OpenAI Failed. Fallback to Gemini.");
            try {
                const text = await this.callGemini(systemPrompt + "\nOutput JSON.", true);
                return JSON.parse(text);
            } catch {
                return {
                    title: "Mock Course (AI Failed)",
                    description: "AI extraction failed.",
                    subject: subjects[0] || "General",
                    price: 99.99,
                    gradeLevel: "12",
                    tags: ["error"]
                };
            }
        }
    }

    async seedInitialData() {
        const count = await KnowledgeBase.countDocuments();
        if (count > 0) {
            return { message: "Collection exists. If you switched embeddings, please drop 'knowledgebases' collection and re-seed." };
        }

        const sampleDocs = [
            // --- POLICIES (20) ---
            { question: "When can teachers request payouts?", answer: "Teachers can request payouts once their balance exceeds $50. Payouts are processed via Stripe Connect within 3-5 business days.", type: "policy" },
            { question: "What is the refund policy?", answer: "Students can request a full refund within 30 days of purchase if they have successfully completed less than 20% of the course.", type: "policy" },
            { question: "What is the platform fee?", answer: "El Mister takes a 10% platform fee on all course sales. The remaining 90% is distributed to the teacher.", type: "policy" },
            { question: "Do teachers retain content ownership?", answer: "Yes, teachers retain 100% intellectual property rights to their content. El Mister creates a license to host and distribute it.", type: "policy" },
            { question: "What content is prohibited?", answer: "Hate speech, sexually explicit material, violence, and illegal content are strictly prohibited and will result in immediate account termination.", type: "policy" },
            { question: "Is there a student code of conduct?", answer: "Students must maintain professional behavior in Q&A sections. Harassment or spamming leads to suspension.", type: "policy" },
            { question: "How are accounts terminated?", answer: "Accounts violating Terms of Service are issued one warning before termination, except for severe violations which are immediate.", type: "policy" },
            { question: "Is the platform GDPR compliant?", answer: "Yes, we adhere to GDPR. Users can request data deletion by contacting privacy@elmister.com.", type: "policy" },
            { question: "Do I need to file taxes?", answer: "Teachers earning over $600/year will receive a 1099-K form via Stripe. You are responsible for reporting this income.", type: "policy" },
            { question: "How long does course approval take?", answer: "All new courses undergo a quality review which typically takes 24-48 hours.", type: "policy" },
            { question: "What are the course price limits?", answer: "Courses can be priced between $9.99 and $499.99. Free courses are also allowed.", type: "policy" },
            { question: "Are there limits on free courses?", answer: "Free courses are limited to 2 hours of video content to encourage premium quality.", type: "policy" },
            { question: "Can I create coupons?", answer: "Yes, teachers can generate up to 10 active discount coupons per month for their courses.", type: "policy" },
            { question: "How does the affiliate program work?", answer: "Referrers earn a 5% commission on course sales generated through their unique link. Cookies last 30 days.", type: "policy" },
            { question: "How are disputes resolved?", answer: "Disputes between students and teachers are mediated by our support team. Their decision is final.", type: "policy" },
            { question: "What happens to inactive accounts?", answer: "Accounts inactive for over 2 years may be archived, but purchased content remains accessible.", type: "policy" },
            { question: "Can I have multiple accounts?", answer: "No, users are limited to one account. Creating multiple accounts to abuse coupons is banned.", type: "policy" },
            { question: "What is the age requirement?", answer: "Users must be at least 13 years old to use the platform. Under 18 requires parental consent.", type: "policy" },
            { question: "Can I bundle courses?", answer: "Yes, you can create course bundles. The price must be at least 20% lower than the sum of individual courses.", type: "policy" },
            { question: "Do you own my student data?", answer: "El Mister owns the user relationship. Teachers cannot export student emails for off-platform marketing.", type: "policy" },

            // --- FAQs (20) ---
            { question: "How do I create a course?", answer: "Navigate to the Teacher Dashboard, click 'My Courses', and select 'Create New Course'. Upload a thumbnail and add lessons.", type: "faq" },
            { question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login screen and follow the email instructions.", type: "faq" },
            { question: "How can I change my email address?", answer: "Go to Profile Settings > Account Security to update your email address.", type: "faq" },
            { question: "What video formats are supported?", answer: "We support MP4, MOV, and AVI files. MP4 is recommended for best streaming performance.", type: "faq" },
            { question: "What is the maximum video file size?", answer: "The maximum file size per video upload is 4GB.", type: "faq" },
            { question: "How do I add a quiz?", answer: "In the Course Builder, click 'Add Curriculum Item' and select 'Quiz' instead of 'Lecture'.", type: "faq" },
            { question: "Are certificates generated automatically?", answer: "Yes, students receive a Certificate of Completion automatically when they finish 100% of the course.", type: "faq" },
            { question: "Is there a mobile app?", answer: "Currently, we have a responsive web app. Native iOS and Android apps are in development.", type: "faq" },
            { question: "Can students view videos offline?", answer: "Offline viewing is currently not supported to protect content piracy.", type: "faq" },
            { question: "How do I contact support?", answer: "You can reach us at support@elmister.com or use the 'Help' widget in the dashboard.", type: "faq" },
            { question: "Can I change my course price later?", answer: "Yes, you can modify your course price at any time from the Course Settings page.", type: "faq" },
            { question: "How do I delete my course?", answer: "You can unpublish a course at any time. If students are enrolled, you cannot permanently delete it, only archive it.", type: "faq" },
            { question: "How do I message my students?", answer: "Use the Q&A board or the 'Announcements' tool to send updates to all enrolled students.", type: "faq" },
            { question: "Do you support live streaming?", answer: "Live streaming is not built-in, but you can embed Zoom or YouTube Live links in your lessons.", type: "faq" },
            { question: "How often are analytics updated?", answer: "Sales and engagement analytics are updated in real-time.", type: "faq" },
            { question: "Why is my Stripe connection failing?", answer: "Ensure you are not using a restricted bank account. Contact Stripe support for specific account alerts.", type: "faq" },
            { question: "Is there a dark mode?", answer: "Yes, you can toggle Dark Mode in the footer or your profile settings.", type: "faq" },
            { question: "What languages are supported?", answer: "The platform interface supports English and Arabic. Course content can be in any language.", type: "faq" },
            { question: "Can I gift a course to a friend?", answer: "Yes, select 'Gift this Course' at checkout and enter the recipient's email.", type: "faq" },
            { question: "Do you offer API access?", answer: "API access is available for Enterprise plans only. Contact business@elmister.com.", type: "faq" }
        ];

        const inserted = [];
        for (const doc of sampleDocs) {
            let embedding;
            try {
                // Embed "Question + Answer" for context 
                embedding = await embeddings.embedQuery(`${doc.question} ${doc.answer}`);
            } catch (error) {
                console.error("Gemini Embedding Error:", error); // Log full error object
                console.warn("Gemini Embedding Failed. Using Mock Vector (768 dims).");
                embedding = new Array(768).fill(0.01);
            }
            inserted.push({ ...doc, embedding });
        }

        await KnowledgeBase.insertMany(inserted);
        return { message: "Seeded 40 docs with Gemini (768 dims). Please Re-Create Atlas Index now!", insertedCount: 40 };
    }
}

export default new RagService();
