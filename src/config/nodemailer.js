import nodemailer from 'nodemailer';
import { NODEMAILER_CONFIG } from '../utils/constants.js';

const transporter = nodemailer.createTransport(NODEMAILER_CONFIG);

export default transporter;