const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const mapping = {
  'BetaEnrollModal': 'modals/BetaEnrollModal',
  'EarlyAccessModal': 'modals/EarlyAccessModal',
  'FeedbackModal': 'modals/FeedbackModal',
  'NotificationPermissionModal': 'modals/NotificationPermissionModal',
  'RatingModal': 'modals/RatingModal',
  'ReferralPopup': 'modals/ReferralPopup',
  'UpgradeModal': 'modals/UpgradeModal',
  'BetaBanner': 'banners/BetaBanner',
  'FoundersBanner': 'banners/FoundersBanner',
  'NotificationBanner': 'banners/NotificationBanner',
  'TopBanner': 'banners/TopBanner',
  'layout': 'layout/layout',
  'Logo': 'layout/Logo',
  'MaintenanceOverlay': 'layout/MaintenanceOverlay',
  'AvatarPicker': 'shared/AvatarPicker',
  'PlanGate': 'shared/PlanGate',
  'WeeklyReportCard': 'shared/WeeklyReportCard',
  'ContentCalendar': 'shared/ContentCalendar'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules')) walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const [oldName, newPath] of Object.entries(mapping)) {
        const regex1 = new RegExp(`from ["']@/components/${oldName}["']`, 'g');
        if (regex1.test(content)) {
          content = content.replace(regex1, `from "@/components/${newPath}"`);
          changed = true;
        }
        
        const regex2 = new RegExp(`from ["']\\.\\./components/${oldName}["']`, 'g');
        if (regex2.test(content)) {
          content = content.replace(regex2, `from "../components/${newPath}"`);
          changed = true;
        }
        
        const regex3 = new RegExp(`from ["']\\./components/${oldName}["']`, 'g');
        if (regex3.test(content)) {
          content = content.replace(regex3, `from "./components/${newPath}"`);
          changed = true;
        }
      }

      // Also fix imports *inside* the moved files themselves
      // If a file inside 'Layout' imports from '@/components/modals/...', it's covered by the above if it uses @
      // But if it used `./AvatarPicker` and is now in `shared/`, then we might have broken relative imports.
      // Wait, all files we moved previously used `@/components/...` mostly, except maybe sibling imports. Let's fix sibling imports too.

      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

walk(srcDir);
