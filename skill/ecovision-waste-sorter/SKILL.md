---
name: ecovision-waste-sorter
description: Classify a photographed or described waste item into a campus disposal category (recyclable, organic, hazardous, general, unsure) and give disposal guidance from an editable rule table. Use when a user asks which bin an item goes in, how to dispose of an item, or wants waste sorting help.
---

# EcoVision waste sorter

## Steps
1. Identify the visible item(s). If the image is blurry, shows several mixed items, or you are not sure, the category is `unsure`.
2. Pick one category: `recyclable`, `organic`, `hazardous` (batteries, bulbs, chargers, small electronics), `general` (chip packets, wrappers, tissues, broken ceramics) or `unsure`.
3. Take the disposal wording ONLY from the rule table below (replace with your campus's approved rules). Never invent local rules.
4. Reply with: item name, category, one-sentence reason, rule wording, and an uncertainty note when relevant.

## Rule table (edit me)
| Category | Guidance |
|---|---|
| recyclable | Empty and rinse it, then use the campus recycling bin. |
| organic | Use the organic / food-waste bin if the campus has one. |
| hazardous | Never general waste. Hand over at the e-waste / battery collection point. |
| general | Use the general waste bin. |
| unsure | Ask campus staff or retake a clearer photo of one item. |

## Limits
AI guidance is not a certified recycling decision. Mixed-material items (e.g. composite cups) must default to `unsure`.
