import re

filepath = r"c:\Users\Pc\OneDrive\Desktop\Grow Flow AI\Grow-flow-ai-main\frontend\src\pages\core\generate.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the readonly props
content = re.sub(
    r'function CopyBtn\(\{ text, label, size = "default" \}: \{ text: string; label\?: string, size\?: "default" | "xs" \}\)', 
    r'function CopyBtn({ text, label, size = "default" }: Readonly<{ text: string; label?: string, size?: "default" | "xs" }>)', 
    content
)

content = re.sub(
    r'function SectionCard\(\{(.*?)\}: \{(.*?)\}\)', 
    r'function SectionCard({\1}: Readonly<{\2}>)', 
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'function AbDuelView\(\{(.*?)\}: \{(.*?)\}\)', 
    r'function AbDuelView({\1}: Readonly<{\2}>)', 
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'function AbTestResults\(\{ result \}: \{ result: any \}\)', 
    r'function AbTestResults({ result }: Readonly<{ result: any }>)', 
    content
)

content = re.sub(
    r'function PlatformSelector\(\{(.*?)\}: \{(.*?)\}\)', 
    r'function PlatformSelector({\1}: Readonly<{\2}>)', 
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'function ToneSelector\(\{(.*?)\}: \{(.*?)\}\)', 
    r'function ToneSelector({\1}: Readonly<{\2}>)', 
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'function ToneOption\(\{(.*?)\}: \{(.*?)\}\)', 
    r'function ToneOption({\1}: Readonly<{\2}>)', 
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'function GenerationControls\(\{(.*?)\}: \{(.*?)\}\)', 
    r'function GenerationControls({\1}: Readonly<{\2}>)', 
    content,
    flags=re.DOTALL
)

content = re.sub(
    r'function ResultCard\(\{(.*?)\}: \{(.*?)\}\)', 
    r'function ResultCard({\1}: Readonly<{\2}>)', 
    content,
    flags=re.DOTALL
)

# Remove unused states
states_to_remove = [
    'showGuide', 'viralMode', 'batchMode', 'styleMode', 'isRunningAbTest', 
    'isFavorited', 'trendsData', 'trendsLoading', 'favoriteLoading', 
    'sparkNudgeDismissed', 'generationBlockedMsg', 'showPostGenUpsell', 
    'hookScore', 'isScoringHook', 'ideaValue', 'showNPS', 'npsTrigger',
    'directFeedback', 'directSuggestion', 'isRepurposing'
]

for state in states_to_remove:
    # Match const [state, setState] = useState...
    capitalized = state[0].upper() + state[1:]
    pattern = r'\s*const \[' + state + r', set' + capitalized + r'\] = useState(?:<.*?>)?\(.*?\);'
    content = re.sub(pattern, '', content)

# Remove unused vars
vars_to_remove = ['sub', 'refetchSub', 'navigate', 'isStarterUser', 'isCreatorUser', 'isInfinityUser']
for var in vars_to_remove:
    pattern = r'\s*const ' + var + r' = .*?;'
    content = re.sub(pattern, '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("generate.tsx cleaned up.")
