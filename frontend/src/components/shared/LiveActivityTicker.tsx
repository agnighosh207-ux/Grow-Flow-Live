import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FIRST_NAMES = ["Liam", "Noah", "Oliver", "Elijah", "James", "William", "Benjamin", "Lucas", "Henry", "Alexander", "Mason", "Michael", "Ethan", "Daniel", "Jacob", "Logan", "Jackson", "Levi", "Sebastian", "Mateo", "Jack", "Owen", "Theodore", "Aiden", "Samuel", "Joseph", "John", "David", "Wyatt", "Matthew", "Luke", "Asher", "Carter", "Julian", "Grayson", "Leo", "Jayden", "Gabriel", "Isaac", "Lincoln", "Anthony", "Hudson", "Dylan", "Ezra", "Thomas", "Charles", "Christopher", "Jaxon", "Maverick", "Josiah", "Isaiah", "Andrew", "Elias", "Joshua", "Nathan", "Caleb", "Ryan", "Adrian", "Miles", "Eli", "Olivia", "Emma", "Charlotte", "Amelia", "Ava", "Sophia", "Isabella", "Mia", "Evelyn", "Harper", "Luna", "Camila", "Gianna", "Elizabeth", "Eleanor", "Ella", "Abigail", "Sofia", "Avery", "Scarlett", "Emily", "Aria", "Penelope", "Chloe", "Layla", "Mila", "Nora", "Hazel", "Madison", "Ellie", "Lily", "Nova", "Isla", "Grace", "Violet", "Aurora", "Riley", "Zoey", "Willow", "Emilia", "Stella", "Zoe", "Victoria", "Hannah", "Addison", "Lucy", "Eliana", "Ivy", "Everly", "Priya", "Rahul", "Aisha", "Sneha", "Vikram", "Meera", "Devon", "Marcus", "Karan", "Rohan", "Ananya", "Riya", "Arjun", "Neha", "Fatima", "Ali", "Omar", "Hassan", "Yusuf"];
const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PLATFORMS = [
  { name: "Instagram", color: "text-pink-400" },
  { name: "Twitter", color: "text-blue-400" },
  { name: "LinkedIn", color: "text-sky-400" },
  { name: "YouTube", color: "text-red-400" }
] as const;
const ACTIONS = {
  "Instagram": ["generated a Viral post", "generated a Story post", "generated Viral hooks", "created visual briefs", "generated a reel script", "crafted Instagram content"],
  "Twitter": ["created a Twitter thread", "built a 7-tweet thread", "generated industry insights", "crafted a viral tweet", "wrote a witty reply thread"],
  "LinkedIn": ["generated Business content", "created Educational content", "wrote a professional post", "generated networking outreach", "shared a startup journey"],
  "YouTube": ["created a YouTube script", "generated video hooks", "created a video description", "built a viral shorts script"]
};

export function LiveActivityTicker() {
  const [activity, setActivity] = useState<any>(null);

  useEffect(() => {
    const updateActivity = () => {
      if (document.hidden) return;
      const platforms = Object.keys(ACTIONS) as (keyof typeof ACTIONS)[];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const actionList = ACTIONS[platform];
      const action = actionList[Math.floor(Math.random() * actionList.length)];
      const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const initial = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
      
      setActivity({
        user: `${name} ${initial}.`,
        action,
        platform,
        time: "just now"
      });
    };
    
    updateActivity();
    const interval = setInterval(updateActivity, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-20 md:bottom-16 right-4 z-50 pointer-events-none max-w-[320px]">
      <AnimatePresence mode="wait">
        {activity && (
          <motion.div
            key={`${activity.user}-${activity.action}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#100726]/90 backdrop-blur-md border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <div className="text-[11px] text-white/70 leading-tight">
              <span className="font-semibold text-white/90">{activity.user}</span> {activity.action}
              <span className={`ml-1.5 font-medium ${PLATFORMS.find(p => p.name === activity.platform)?.color}`}>
                on {activity.platform}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
