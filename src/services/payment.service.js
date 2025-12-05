import stripe from "../config/stripe.js";
import AppError from "../utils/app.error.js";

class PaymentService {
  
/* --- --- --- PRODUCTS MANAGER --- --- --- */
  /** Create a Product and Price in Stripe
   * @param {string} title - Group title
   * @param {number} price - Amount
   * @param {string} currency - Currency code (usd)
   */
  async registerProduct(title, price, currency = 'usd') {
      //Create Product
      const product = await stripe.products.create({
        name: title,
      });
      if (!product) throw new AppError("Stripe Product Creation Error");

      //Create Price
      const priceTag = await stripe.prices.create({
        unit_amount: Math.round(price * 100), // cents
        currency: currency,
        recurring: { interval: 'month' },
        product: product.id,
      });
      if (!priceTag) throw new AppError("Stripe Price Creation Error");
      
      return {
        productId: product.id,
        priceId: priceTag.id,
        price: priceTag.unit_amount,
        billingInterval: 'month'
      };

  }

  /** Get Stripe Product
   * @param {string} id - Stripe Product Id
   * @returns {object} Stripe Product
   * */
  async getProduct(id) {
    const product = await stripe.products.retrieve(id);
    return product;
  }

  async syncProduct(productModel) {
    const product = await this.getProduct(productModel.stripe.productId);
    productModel.stripe.priceId = product.default_price;
    productModel.stripe.price = product.default_price.unit_amount;
    await productModel.save();
  }

  /** Create Checkout Session for Subscription
   * @param {object} data - { customerId, priceId, successUrl, cancelUrl, metadata }
   * @returns {object} Stripe Checkout Session
   */
  async createCheckoutSession({ 
    customerId, priceId, 
    successUrl, cancelUrl, 
    metadata 
  }) {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return session;
  }

  /* --- --- --- HELPERS --- --- --- */
    /** Create or Get Stripe Customer
   * @param {object} user - Authenticated user object
   * @param {object} profile - user profile
   * @returns {string} Stripe Customer Id
   */
  async getCustomerId(user, profile) {

    const userId = user.id || user._id;

    if(!userId || userId !== profile.user._id) return null;

    if (profile.stripe?.customerId) return profile.stripe.customerId;

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        parentId: (user._id || user.id).toString(),
      },
    });

    return customer.id;
  }

  /* --- --- --- WEBHOOKS --- --- --- */
}

export default new PaymentService();