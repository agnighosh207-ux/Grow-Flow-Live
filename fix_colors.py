import os
import re

frontend_src = r"c:\Users\Pc\OneDrive\Desktop\Grow Flow AI\Grow-flow-ai-main\frontend\src"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # FIX 2: generator empty states
    if r"pages\generators" in filepath or "pages/generators" in filepath:
        # Match className="... bg-white/5 border border-white/10 ..."
        content = re.sub(r'className="(.*?)bg-white/5 border border-white/10(.*?)"', 
                         r'className="\1\2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}', content)
        # Match className="... text-white/20 ..." 
        content = re.sub(r'className="(.*?)text-white/20(.*?)"',
                         r'className="\1\2" style={{ color: "var(--text-disabled)" }}', content)
        
        # Clean up double spaces in className
        content = content.replace('  ', ' ')
        content = content.replace('className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 "', 'className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"')
        content = content.replace('className="w-5 h-5 "', 'className="w-5 h-5"')

    # FIX 3: WeeklyReportCard.tsx
    if "WeeklyReportCard.tsx" in filepath:
        content = content.replace("bg-cyan-500/10", "bg-[#5E6AD2]/10")
        content = content.replace("bg-cyan-500/20", "bg-[#5E6AD2]/20")
        content = content.replace("bg-cyan-500", "bg-[#5E6AD2]")
        content = content.replace("text-cyan-400", "text-[#8B91E3]")
        content = content.replace("text-cyan-500", "text-[#8B91E3]")
        content = content.replace("border-cyan-500/20", "border-[rgba(94,106,210,0.3)]")
        content = content.replace("border-cyan-500", "border-[#5E6AD2]")
        content = content.replace("shadow-cyan-500/20", "shadow-[rgba(94,106,210,0.2)]")

    # FIX 4: PlanGate.tsx
    if "PlanGate.tsx" in filepath:
        content = content.replace('text-cyan-400', 'text-white" style={{ color: "#8B91E3" }}').replace('text-white" style={{ color: "#8B91E3" }}"', 'text-white" style={{ color: "#8B91E3" }}')
        content = content.replace('bg-cyan-500 hover:bg-cyan-600 text-black', 'text-white hover:opacity-90" style={{ background: "#5E6AD2" }}')

    # FIX 5: GenerateButton.tsx
    if "GenerateButton.tsx" in filepath:
        content = content.replace('bg-cyan-500 text-black hover:bg-cyan-400', 'text-white hover:opacity-90" style={{ background: "#5E6AD2" }}')
        content = content.replace('bg-cyan-600', 'bg-white/10" style={{ background: "rgba(94,106,210,0.5)" }}')

    # FIX 6: ErrorBoundary.tsx and AppErrorBoundary.tsx
    if "ErrorBoundary.tsx" in filepath:
        content = content.replace('bg-cyan-500 text-black hover:bg-cyan-400', 'text-white hover:opacity-90" style={{ background: "#5E6AD2" }}')
        content = content.replace('bg-cyan-500 text-black', 'text-white" style={{ background: "#5E6AD2" }}')
        content = content.replace('text-cyan-400', 'text-white" style={{ color: "#8B91E3" }}')

    # FIX 7: SuspendedView.tsx
    if "SuspendedView.tsx" in filepath:
        content = content.replace('text-cyan-400', 'text-white" style={{ color: "#8B91E3" }}')
        content = content.replace('text-cyan-500', 'text-white" style={{ color: "#8B91E3" }}')
        content = content.replace('text-violet-400', 'text-white" style={{ color: "#8B91E3" }}')
        content = content.replace('bg-violet-500 hover:bg-violet-600', 'hover:opacity-90" style={{ background: "#5E6AD2" }}')
        content = content.replace('border-violet-500/20', 'border-[rgba(94,106,210,0.2)]')

    # FIX 8: Global find and replace
    content = content.replace("#00F2FF", "#8B91E3")
    content = content.replace("#7c3aed", "#5E6AD2")
    content = content.replace("#6d28d9", "#4A52B8")

    # replace any remaining text-cyan-400 and bg-cyan-500 
    if 'text-cyan-400' in content:
        content = re.sub(r'className="(.*?)text-cyan-400(.*?)"', r'className="\1\2" style={{ color: "#8B91E3" }}', content)
    if 'bg-cyan-500' in content:
        content = re.sub(r'className="(.*?)bg-cyan-500(.*?)text-black(.*?)"', r'className="\1\2text-white\3" style={{ background: "#5E6AD2" }}', content)
        content = re.sub(r'className="(.*?)bg-cyan-500(.*?)"', r'className="\1\2" style={{ background: "#5E6AD2" }}', content)

    if original != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(frontend_src):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            process_file(os.path.join(root, file))
