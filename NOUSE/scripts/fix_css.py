with open('frontend/src/index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()
# keep up to line 394 (which is index 393)
new_lines = lines[:394]
css_to_add = """
/* LIGHT MODE TOGGLE */
html.light-mode {
  filter: invert(1) hue-rotate(180deg);
  background: #000;
}
html.light-mode img, 
html.light-mode video, 
html.light-mode .recharts-wrapper, 
html.light-mode [style*="background-image"] {
  filter: invert(1) hue-rotate(180deg);
}
"""
new_lines.append(css_to_add)
with open('frontend/src/index.css', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
