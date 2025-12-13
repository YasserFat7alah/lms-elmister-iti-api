import User from "../../models/users/User.js";
import Course from "../../models/Course.js";
import Group from "../../models/Group.js";
import Enrollment from "../../models/Enrollment.js";
import ParentProfile from "../../models/users/ParentProfile.js";
import StudentProfile from "../../models/users/StudentProfile.js";
import TeacherProfile from "../../models/users/TeacherProfile.js";
import AppError from "../../utils/app.error.js";

class AdminService {
  async getDashboard() {
    const [
      userCounts,
      courseCounts,
      groupCounts,
      subscriptionCounts,
      enrollmentsSeries,
    ] = await Promise.all([
      this.getUserCounts(),
      this.getCourseCounts(),
      this.getGroupCounts(),
      this.getSubscriptionCounts(),
      this.getEnrollmentSeries(),
    ]);

    return {
      users: userCounts,
      courses: courseCounts,
      groups: groupCounts,
      subscriptions: subscriptionCounts,
      timeSeries: enrollmentsSeries,
    };
  }

  async getUserCounts() {
    const counts = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      students: 0,
      parents: 0,
      teachers: 0,
      admins: 0,
    };

    counts.forEach(({ _id, count }) => {
      result.total += count;
      if (_id === 'student') result.students = count;
      if (_id === 'parent') result.parents = count;
      if (_id === 'teacher') result.teachers = count;
      if (_id === 'admin') result.admins = count;
    });

    return result;
  }

  async getCourseCounts() {
    const counts = await Course.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      active: 0,
      archived: 0,
      inReview: 0
    };

    counts.forEach(({ _id, count }) => {
      result.total += count;
      // explicit mapping based on requirements: active -> published
      if (_id === 'published') result.active = count;
      if (_id === 'archived') result.archived = count;
      if (_id === 'in-review') result.inReview = count;
    });

    return result;
  }

  async getGroupCounts() {
    // "Active groups" usually means status is 'open' or currently running.
    // Requirements said "active groups". Group model has status: ["open", "closed"].
    // We will count 'open' as active.
    const activeGroups = await Group.countDocuments({ status: "open" });
    return { active: activeGroups };
  }

  async getSubscriptionCounts() {
    // "total subscriptions" -> total enrollments
    const total = await Enrollment.countDocuments();
    return total;
  }

  async getEnrollmentSeries() {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);
    lastWeek.setHours(0, 0, 0, 0);

    // 1. Get new enrollments per day
    const newEnrollmentsData = await Enrollment.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeek },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfWeek: "$createdAt" }, // 1 (Sun) - 7 (Sat)
            // We can also project the date strings to match easier if needed, but dayOfWeek is fine
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // 2. Get "Active Users" (Total Students) per day (Cumulative)
    // This is tricky. "Active Users" usually means unique logins.
    // As per plan, we will use "cumulative students count" or just "total unique students enrolled so far".
    // Alternatively, request showed: { day: "Mon", newEnrollments: 20, activeUsers: 150 }
    // which implies a snapshot of active users on that day.
    // Simulating "Active Users on Day X" = "Total Users created <= Day X"
    // This is a reasonable proxy for "User Base Growth".

    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(lastWeek);
      date.setDate(lastWeek.getDate() + i);
      const dayName = days[date.getDay()];

      // Start of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      // End of day
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Find enrollments for this specific day
      // Note: $dayOfWeek returns 1 for Sun, 2 for Mon... 
      // Our loop might be misaligned if we strictly rely on aggregation array order.
      // Better to filter the aggregation result or just query in loop (less efficient but safer for strictly 7 days).
      // Given small scale (7 days), querying or in-memory map is fine.

      // Optimization: Use the aggregation results map
      const dayEnrollment = newEnrollmentsData.find(d => {
        // Comparing date strings is safer
        const dDate = new Date(d._id.date);
        return dDate.toDateString() === date.toDateString();
      });

      const newEnrollments = dayEnrollment ? dayEnrollment.count : 0;

      // Active Users: Total users created up to end of this day
      // "activeUsers" in request context likely meant "Total Active User Base".
      const activeUsers = await User.countDocuments({
        role: "student", // Assuming we focus on students as "users"
        createdAt: { $lte: endOfDay }
      });

      result.push({
        day: dayName,
        newEnrollments,
        activeUsers
      });
    }

    return result;
  }

  /**
   * Admin: Get detailed user info by ID (Role-specific)
   * @param {string} userId
   */
  async getUserDetails(userId) {
    const user = await User.findById(userId).lean();
    if (!user) throw AppError.notFound("User not found");

    let details = { ...user };

    if (user.role === 'parent') {
      // Fetch Children: Name, Email, Username, Grade, ID
      const parentProfile = await ParentProfile.findOne({ user: userId }).populate({
        path: 'children',
        select: 'name email username'
      }).lean();

      if (parentProfile?.children) {
        // Hydrate with Grade from StudentProfile
        const childrenWithGrade = await Promise.all(parentProfile.children.map(async (child) => {
          const sProfile = await StudentProfile.findOne({ user: child._id }).select('grade');
          return {
            ...child,
            grade: sProfile?.grade || 'N/A'
          };
        }));
        details.children = childrenWithGrade;
      } else {
        details.children = [];
      }

    } else if (user.role === 'student') {
      // Fetch Parent: Name, Email, Username, ID
      const studentProfile = await StudentProfile.findOne({ user: userId }).populate({
        path: 'parent',
        select: 'name email username phone'
      }).lean();

      details.parent = studentProfile?.parent || null;
      details.grade = studentProfile?.grade;

    } else if (user.role === 'teacher') {
      // Fetch Stats: Rating, Course Counts, Group Count
      const teacherProfile = await TeacherProfile.findOne({ user: userId }).lean();

      // Course Counts
      const courses = await Course.find({ teacherId: userId }).select('status');
      const courseStats = {
        total: courses.length,
        published: courses.filter(c => c.status === 'published').length,
        inReview: courses.filter(c => c.status === 'inReview').length,
        archived: courses.filter(c => c.status === 'archived').length,
        draft: courses.filter(c => c.status === 'draft').length,
      };

      // Group Count
      const groupsCount = await Group.countDocuments({ teacherId: userId });

      details.teacherStats = {
        totalRating: teacherProfile?.averageRating || 0,
        totalReviews: teacherProfile?.totalRatings || 0,
        courses: courseStats,
        totalGroups: groupsCount,
        bio: teacherProfile?.bio,
        subjects: teacherProfile?.subjects
      };
    }

    return details;
  }
}



export default new AdminService();
