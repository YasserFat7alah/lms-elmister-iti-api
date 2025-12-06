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

    const userId = user._id || user.id;

    if(!userId || userId.toString() !== profile.user._id.toString()) return null;

    if (profile.stripe?.customerId) {
      console.log(profile.stripe?.customerId);
      
      return profile.stripe.customerId
    };

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        parentId: (user._id || user.id).toString(),
      },
    });

    profile.stripe = profile.stripe || {};
    profile.stripe.customerId = customer.id;
    console.log(profile.stripe?.customerId);
    await profile.save();

    return customer.id;
  }
  
    /** Use Payment Method
     * @param {string} customerId - Stripe Customer Id
     * @param {string} paymentMethodId - Stripe Payment Method Id
     * @param {object} profile - parent profile
     * @returns {string} Stripe Payment Method Id
     * */
    async usePaymentMethod(customerId, paymentMethodId, profile) {
      if (!paymentMethodId && profile.stripe?.defaultPaymentMethodId) {
        return profile.stripe.defaultPaymentMethodId;
      }
  
      if (!paymentMethodId) {
        throw AppError.badRequest("paymentMethodId is required!");
      }
  
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
  
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
  
      profile.stripe = profile.stripe || {};
      profile.stripe.defaultPaymentMethodId = paymentMethodId;
      await profile.save();
  
      return paymentMethodId;
    }
  
    /** get price id from stripe
     * @param {object} group
     * @returns {string} Stripe Price Id
     * */
    async getPriceId(group) {
      if (!group.stripe) group.stripe = {};
      
  
      if (group.stripe.priceId && group.stripe.price === group.price) {
        return group.stripe.priceId;
      }
  
      if (!group.stripe.productId) {
        const product = await stripe.products.create({
          name: `${group.title} (${group._id.toString()})`,
          metadata: {
            groupId: group._id.toString(),
            courseId: group.courseId?._id.toString() || "",
          },
        });
        group.stripe.productId = product.id;
      }
  
      const price = await stripe.prices.create({
        product: group.stripe.productId,
        unit_amount: Math.round(group.price * 100),
        currency: group.currency || "usd",
        recurring: {
          interval: group.stripe.billingInterval || "month",
        },
      });
  
      group.stripe.priceId = price.id;
      group.stripe.price = group.price;
      await group.save();
  
      return price.id;
    }

  /* --- --- --- WEBHOOKS --- --- --- */
}

export default new PaymentService();