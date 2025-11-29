import AppError from "../utils/app.error.js";

//SERVICE THAT DEALS WITH THE DATABASE LAYER (Takes the MODEL as an argument to do the queries)
class BaseService {
    constructor(model) {
        this.model = model;
    }

    /* --- --- --- CRUD OPERATIONS --- --- --- */

    /** Find one document matching the filter
     * @param {object} filter - The filter criteria
     * @param {string} select - Fields to select
     * @returns {object} The found document
     * @throws {AppError} If no document is found
     */
    async findOne(filter, select = '') {
        const query = this.model.findOne(filter);
        if (select) query.select(select);
        const result = await query;
        if (!result) {
            throw AppError.notFound(`Resource not found.`);
        }
        return result;
    }

    /** Find document by ID
     * @param {string} id - The document ID
     * @param {string} select - Fields to select   
     * @returns {object} The found document
     * @throws {AppError} If no document is found
     */
    async findById(id, select = '') {
        const query = this.model.findById(id);
        if (select) query.select(select);
        const result = await query;
        if (!result) {
            throw AppError.notFound(`Resource with id ${id} not found.`);
        }
        return result;

    }
    
    /** Find all documents matching the filter
     * @param {object} filter - The filter criteria
     * @param {string} select - Fields to select
     * @param {string} sort - Sort order
     * @returns {Array} The found documents
     */
    async findAll(filter = {}, select = '', sort = '-createdAt') {
        return await this.model.find(filter).select(select).sort(sort);
    }

    /** Create a new document
     * @param {object} data - The data for the new document
     * @returns {object} The created document
     */
    async create(data) {
        return await this.model.create(data);
    }

    /** Update a document by ID
     * @param {string} id - The document ID
     * @param {object} data - The data to update
     * @returns {object} The updated document
     */
    async updateById(id, data) {
        return await this.model.findByIdAndUpdate(
            id,
            data,
            { new: true, runValidators: true }
        );
    }

    /** Delete a document by ID
     * @param {string} id - The document ID
     * @returns {object} The deleted document
     */
    async deleteById(id) {
        return await this.model.findByIdAndDelete(id);
    }

    /* --- --- --- STATISTICS --- --- --- */

    /** Count documents matching the filter
     * @param {object} filter - The filter criteria
     * @returns {number} The count of documents
     */
    async count(filter = {}) {
        return await this.model.countDocuments(filter);
    }

    /* --- --- --- SANITIZATION --- --- --- */

    /** Sanitize document by removing sensitive fields
     * @param {object} doc - The document to sanitize
     * @returns {object} The sanitized document
     */
    sanitize(doc) {
        if (!doc) return null;

        const obj = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
        const { password, __v, _id, childrenId, ...safe } = obj;
        
        let result = { ...safe };
        if (safe.role === 'parent') {
            result.childrenId = childrenId;
        }
        return {
            id: _id,
            ...result
        };
    }

}

export default BaseService;