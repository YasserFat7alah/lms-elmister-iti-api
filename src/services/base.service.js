import ApiError from "../utils/ApiError.js";

//SERVICE THAT DEALS WITH THE DATABASE LAYER (Takes the MODEL as an argument to do the queries)
class BaseService {
    constructor(model) {
        this.model = model;
    }
    async findOne(filter, select = '') {
            const query = this.model.findOne(filter);
            if (select) query.select(select);
            const result =  await query;
            if (!result) {
                throw ApiError.notFound(`Resource not found.`);
            }
            return result;
    }

    async findById(id, select = '') {
            const query = this.model.findById(id);
            if (select) query.select(select);
            const result = await query;
            if (!result) {
                throw ApiError.notFound(`Resource with id ${id} not found.`);
            }
            return result;

    }
    async findAll(filter = {}, select = '', sort = '-createdAt') {
        try {
            return await this.model.find(filter).select(select).sort(sort);
        } catch (error) {
            throw ApiError.notFound(error.message);
        }
    }

    async create(data) {
            return await this.model.create(data);
    }

    async updateById(id, data) {
        try {
            return await this.model.findByIdAndUpdate(
                id,
                data,
                { new: true, runValidators: true }
            );
        } catch (error) {
            throw new Error(`Error updating ${this.model}: ${error.message}`);
        }
    }

    async deleteById(id) {
        try {
            return await this.model.findByIdAndDelete(id);
        } catch (error) {
            throw new Error(`Error deleting ${this.model}: ${error.message}`);
        }
    }

    async count(filter = {}) {
        try {
            return await this.model.countDocuments(filter);
        } catch (error) {
            throw new Error(`Error counting ${this.model}: ${error.message}`);
        }
    }

}

export default BaseService;