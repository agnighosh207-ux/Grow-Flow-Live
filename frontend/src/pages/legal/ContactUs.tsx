import { Helmet } from "react-helmet-async";
import { Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactUs() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-white/80">
      <Helmet>
        <title>Contact Us | Grow Flow AI</title>
      </Helmet>
      
      <h1 className="text-3xl font-extrabold text-white mb-8">Contact Support & KYC Registry</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-bold text-cyan-300 mb-6">Corporate Office</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-cyan-400 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Grow Flow AI (Registered Address)</p>
                <p className="text-white/60 text-sm mt-1">
                  [Your Physical HQ/Building Name]<br />
                  [Street / Area]<br />
                  [City, State - PIN CODE]<br />
                  India
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-4">
              <Mail className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="font-semibold text-white">Email Address</p>
                <a href="mailto:support@growflowai.space" className="text-cyan-300 text-sm hover:underline">
                  support@growflowai.space
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">Send us a message</h2>
          <form className="space-y-4">
             <div>
               <label className="text-xs font-semibold text-white/50">Name</label>
               <input type="text" className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" placeholder="John Doe" />
             </div>
             <div>
               <label className="text-xs font-semibold text-white/50">Email</label>
               <input type="email" className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" placeholder="john@example.com" />
             </div>
             <div>
               <label className="text-xs font-semibold text-white/50">Message</label>
               <textarea className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm min-h-[100px]" placeholder="How can we help you?" />
             </div>
             <Button className="w-full bg-cyan-600 hover:bg-cyan-500 font-bold text-white">Submit Ticket</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
