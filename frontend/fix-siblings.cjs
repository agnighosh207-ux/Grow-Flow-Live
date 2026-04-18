const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/components');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'ui') walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix ui imports
      content = content.replace(/from '(?:\.\.\/)?ui\/(.*?)'/g, 'from "@/components/ui/$1"');
      content = content.replace(/from "(?:\.\.\/)?ui\/(.*?)"/g, 'from "@/components/ui/$1"');
      content = content.replace(/from '\.\/ui\/(.*?)'/g, 'from "@/components/ui/$1"');
      content = content.replace(/from "\.\/ui\/(.*?)"/g, 'from "@/components/ui/$1"');
      
      // Fix siblings for modals
      content = content.replace(/from '\.\/([A-Za-z]+Modal)'/g, 'from "@/components/modals/$1"');
      content = content.replace(/from "\.\/([A-Za-z]+Modal)"/g, 'from "@/components/modals/$1"');
      content = content.replace(/from '\.\/ReferralPopup'/g, 'from "@/components/modals/ReferralPopup"');
      content = content.replace(/from "\.\/ReferralPopup"/g, 'from "@/components/modals/ReferralPopup"');
      
      // Fix siblings for banners
      content = content.replace(/from '\.\/([A-Za-z]+Banner)'/g, 'from "@/components/banners/$1"');
      content = content.replace(/from "\.\/([A-Za-z]+Banner)"/g, 'from "@/components/banners/$1"');
      
      // Fix siblings for shared
      content = content.replace(/from '\.\/AvatarPicker'/g, 'from "@/components/shared/AvatarPicker"');
      content = content.replace(/from "\.\/AvatarPicker"/g, 'from "@/components/shared/AvatarPicker"');
      content = content.replace(/from '\.\/PlanGate'/g, 'from "@/components/shared/PlanGate"');
      content = content.replace(/from "\.\/PlanGate"/g, 'from "@/components/shared/PlanGate"');

      // Fix siblings for layout
      content = content.replace(/from '\.\/Logo'/g, 'from "@/components/layout/Logo"');
      content = content.replace(/from "\.\/Logo"/g, 'from "@/components/layout/Logo"');
      content = content.replace(/from '\.\/MaintenanceOverlay'/g, 'from "@/components/layout/MaintenanceOverlay"');
      content = content.replace(/from "\.\/MaintenanceOverlay"/g, 'from "@/components/layout/MaintenanceOverlay"');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

walk(srcDir);
