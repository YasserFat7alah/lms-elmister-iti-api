
import asyncHandler from 'express-async-handler';
import AppError from "../utils/app.error.js";
import webhookService from '../services/webhook.service.js';

class WebhookController {

  constructor(service) {
    this.service = service;
  }
  
  /** Handle webhook
   * @routes POST /api/v1/webhooks/enrollments
   * @header { stripe-signature }
   * @body { rawBody }
   * */
  handleWebhook = asyncHandler( async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const body = req.body;

    // construct event
    const event = this.service.constructEvent(signature, body);
    if (!event) throw AppError.internal("Webhook signature verification failed");
    
    // handle event
    await this.service.handleEvent(event);
    
    res.json({ received: true });
  });
}

export default new WebhookController(webhookService);