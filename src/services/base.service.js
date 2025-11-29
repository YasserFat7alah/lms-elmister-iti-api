import AppError from "../utils/app.error.js";

//SERVICE THAT DEALS WITH THE DATABASE LAYER (Takes the MODEL as an argument to do the queries)
class BaseService {
    constructor(model) {
        this.model = model;
    }
    async findOne(filter, select = '') {
        const query = this.model.findOne(filter);
        if (select) query.select(select);
        const result = await query;
        if (!result) {
            throw AppError.notFound(`Resource not found.`);
        }
        return result;
    }

    async findById(id, select = '') {
        const query = this.model.findById(id);
        if (select) query.select(select);
        const result = await query;
        if (!result) {
            throw AppError.notFound(`Resource with id ${id} not found.`);
        }
        return result;

    }
    async findAll(filter = {}, select = '', sort = '-createdAt') {
        return await this.model.find(filter).select(select).sort(sort);
    }

    async create(data) {
        return await this.model.create(data);
    }

    async updateById(id, data) {
        return await this.model.findByIdAndUpdate(
            id,
            data,
            { new: true, runValidators: true }
        );
    }

    async deleteById(id) {
        return await this.model.findByIdAndDelete(id);
    }

    async count(filter = {}) {
        return await this.model.countDocuments(filter);
    }

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