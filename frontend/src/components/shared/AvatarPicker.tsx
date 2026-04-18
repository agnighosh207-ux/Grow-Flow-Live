import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/react";
import { X, Upload, Check, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AvatarPickerProps {
  open: boolean;
  onClose: () => void;
}

const PREBUILT_AVATARS = [
  "/avatars/avatar-1.svg",
  "/avatars/avatar-2.svg",
  "/avatars/avatar-3.svg",
  "/avatars/avatar-4.svg",
  "/avatars/avatar-5.svg",
  "/avatars/avatar-6.svg",
];

export function AvatarPicker({ open, onClose }: AvatarPickerProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  if (!user) return null;

  const handleUpdateAvatar = async (file: Blob | File) => {
    try {
      setIsUpdating(true);
      await user.setProfileImage({ file });
      toast({ title: "Profile picture updated successfully!" });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Failed to update avatar", description: err.errors?.[0]?.longMessage || err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check max size (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum file size is 5MB" });
      return;
    }
    
    handleUpdateAvatar(file);
  };

  const handleSelectPrebuilt = async (url: string) => {
    setSelectedAvatar(url);
    try {
      setIsUpdating(true);
      const response = await fetch(url);
      const svgText = await response.text();
      
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (ctx) {
             ctx.drawImage(img, 0, 0, 256, 256);
          }
          URL.revokeObjectURL(svgUrl);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas toBlob failed"));
          }, "image/png");
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error("Image load failed"));
        };
        img.src = svgUrl;
      });

      const file = new File([pngBlob], "avatar.png", { type: "image/png" });
      await handleUpdateAvatar(file);
    } catch (err) {
      console.error("Error converting avatar to Blob:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load the selected avatar." });
      setIsUpdating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isUpdating ? onClose : undefined}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md relative rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            style={{
              background: "linear-gradient(180deg, rgba(30,15,60,0.95) 0%, rgba(15,5,40,0.98) 100%)",
              boxShadow: "0 0 50px -10px rgba(124, 58, 237, 0.25)"
            }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-violet-400" />
                Change Avatar
              </h2>
              <button 
                onClick={onClose}
                disabled={isUpdating}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Current Avatar Header */}
              <div className="flex flex-col items-center justify-center mb-8 relative">
                <div className="relative">
                  <div className="absolute inset-0 bg-violet-500 rounded-full blur-xl opacity-40 animate-pulse" />
                  <img
                    src={user.imageUrl}
                    alt="Current Avatar"
                    className="w-24 h-24 rounded-full border-4 border-violet-500/50 object-cover shadow-lg relative z-10 bg-[#0f0428]"
                  />
                  {isUpdating && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-full rounded-full border-4 border-transparent">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
                disabled={isUpdating}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdating}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center justify-center gap-2 py-6 rounded-xl font-medium mb-6 transition-all"
              >
                <Upload className="w-5 h-5 text-violet-400" />
                Upload Custom Photo
              </Button>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-xs font-semibold text-white/30 uppercase tracking-widest">Or choose AI Avatar</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              {/* AI Avatars Grid */}
              <div className="grid grid-cols-3 gap-4">
                {PREBUILT_AVATARS.map((url, i) => (
                  <button
                    key={url}
                    disabled={isUpdating}
                    onClick={() => handleSelectPrebuilt(url)}
                    className="relative group rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-violet-500/50 transition-all focus:outline-none"
                  >
                    <img src={url} alt={`AI Avatar ${i+1}`} className="w-full h-full object-cover bg-white/5" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    {isUpdating && selectedAvatar === url && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
