import re

path = '/Users/dhruv/YouTubeAutoEnhancer/XcodeProject/YouTubeAutoEnhancer/YouTubeAutoEnhancer.xcodeproj/project.pbxproj'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace in Extension Debug and Release
# Look for PRODUCT_BUNDLE_IDENTIFIER = com.dhruv.YouTubeAutoEnhancer.Extension;

# In FC71087830698AE00023C785 (Debug) and FC71087930698AE00023C785 (Release)
# Add DEVELOPMENT_TEAM = ADPRATBF24; under CODE_SIGN_STYLE = Automatic;

updated = re.sub(
    r'(/\* Debug configuration for PBXNativeTarget "YouTubeAutoEnhancer Extension" \*/ = \{\s+isa = XCBuildConfiguration;\s+buildSettings = \{\s+CODE_SIGN_STYLE = Automatic;)',
    r'\1\n\t\t\t\t\tDEVELOPMENT_TEAM = ADPRATBF24;',
    content
)

updated = re.sub(
    r'(/\* Release configuration for PBXNativeTarget "YouTubeAutoEnhancer Extension" \*/ = \{\s+isa = XCBuildConfiguration;\s+buildSettings = \{\s+CODE_SIGN_STYLE = Automatic;)',
    r'\1\n\t\t\t\t\tDEVELOPMENT_TEAM = ADPRATBF24;',
    updated
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(updated)

print("Updated project.pbxproj successfully")
