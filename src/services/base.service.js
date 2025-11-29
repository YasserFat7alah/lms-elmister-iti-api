import mongoose from "mongoose";
import AppError from "../utils/app.error.js";

//SERVICE THAT DEALS WITH THE DATABASE LAYER (Takes the MODEL as an argument to do the queries)
class BaseService {
    constructor(model) {
        if (!model) throw new Error("Model required");
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
        this._validateId(id);

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
        this._validateId(id);

        const updated = await this.model.findByIdAndUpdate(
            id,
            data,
            { new: true, runValidators: true }
        );

        if (!updated) {
            throw AppError.notFound(`Resource with id: ${id} not found.`);
        }
        return updated;
    }

    /** Delete a document by ID
     * @param {string} id - The document ID
     * @returns {object} The deleted document
     */
    async deleteById(id) {
        this._validateId(id);
        const deleted = await this.model.findByIdAndDelete(id);
        
        if (!deleted) {
            throw AppError.notFound(`Resource with id: ${id} not found.`);
        }
        return deleted;
    }

    /* --- --- --- STATISTICS --- --- --- */

    /** Count documents matching the filter
     * @param {object} filter - The filter criteria
     * @returns {number} The count of documents
     */
    async count(filter = {}) {
        return await this.model.countDocuments(filter);
    }

    /* --- --- --- HELPERS --- --- --- */

    /** Sanitize document by removing sensitive fields
     * @param {object} doc - The document to sanitize
     * @returns {object} The sanitized document
     */
    sanitize(doc) {
        if (!doc) return null;

        const obj = doc.toObject ? doc.toObject({ virtuals: true }) : {...doc};
        const { password, __v, childrenId, ...rest } = obj;
        
        let safe = { ...rest };
        if (rest.role === 'parent') safe.childrenId = childrenId;

        return {
            ...safe
        };
    }

    /** Validate if the given ID is a valid MongoDB ObjectId
     * @param {string} id - The ID to validate
     * @throws {AppError} If the ID is not valid
     */
    _validateId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest(`Invalid id: ${id}`);
    }
  }

}

export default BaseService;