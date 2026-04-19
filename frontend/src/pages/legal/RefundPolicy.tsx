import { Helmet } from "react-helmet-async";

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-white/80">
      <Helmet>
        <title>Refund Policy | Grow Flow AI</title>
      </Helmet>
      
      <h1 className="text-3xl font-extrabold text-white mb-8">Refund Policy</h1>
      
      <div className="space-y-6">
        <div className="p-6 border border-red-500/30 bg-red-500/5 rounded-xl">
          <h2 className="text-xl font-bold text-red-400 mb-2">STRICT PREMISE: AI COMPUTE COSTS</h2>
          <p className="font-semibold text-white">
            Due to the exceptionally high, non-refundable cost of commercial AI GPU compute (utilizing 70B parameter endpoints), absolutely no refunds are provided once AI generation credits have been utilized.
          </p>
        </div>

        <section>
          <h2 className="text-xl font-bold text-violet-300 mb-2">Subscription Cancellations</h2>
          <p>You may cancel your Monthly recurring subscription via the Razorpay Customer Portal at any moment. Your premium tier limits will remain fully active until the end of the billing period.</p>
        </section>
      </div>
    </div>
  );
}
