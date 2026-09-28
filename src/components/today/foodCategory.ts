/**
 * Picks an illustration category for a food from its name. Rules are checked in
 * order, so specific ones (Apfelsaft, Käsekuchen, Leberkäse) sit before the
 * general ones they'd otherwise fall into (Apfel, Käse). German names are
 * matched as substrings because of compounds (Hähnchenbrustfilet); short words
 * that hide inside others (Ei, Eis, Tee) use word boundaries.
 */
export type FoodCategory =
  | 'egg'
  | 'bread'
  | 'pastry'
  | 'cereal'
  | 'rice'
  | 'pasta'
  | 'potato'
  | 'fries'
  | 'apple'
  | 'banana'
  | 'berries'
  | 'citrus'
  | 'avocado'
  | 'greens'
  | 'salad'
  | 'carrot'
  | 'tomato'
  | 'chicken'
  | 'meat'
  | 'sausage'
  | 'fish'
  | 'legume'
  | 'milk'
  | 'yogurt'
  | 'cheese'
  | 'fat'
  | 'sauce'
  | 'coffee'
  | 'juice'
  | 'soda'
  | 'beer'
  | 'wine'
  | 'water'
  | 'nut'
  | 'chocolate'
  | 'sweets'
  | 'cake'
  | 'cookie'
  | 'icecream'
  | 'chips'
  | 'protein'
  | 'pizza'
  | 'burger'
  | 'soup'
  | 'dish';

type Rule = [FoodCategory, RegExp];

// Word boundary that understands umlauts (JS \b is ASCII-only).
const B = '(?<![a-zäöüß])';
const E = '(?![a-zäöüß])';
const w = (words: string) => new RegExp(`${B}(?:${words})${E}`);
const s = (parts: string) => new RegExp(parts);

const RULES: Rule[] = [
  // Drinks first: "Apfelsaft", "Orangensaft", "Almond milk", "Hafer Drink", "Ice cream".
  ['icecream', s('ice cream|eiscreme|speiseeis|gelato|frozen yogurt|sorbet|magnum')],
  ['icecream', w('eis')],
  ['juice', s('(?<!eigenen |im )saft|juice|schorle|smoothie|nektar(?!ine)')],
  ['soda', w('cola|coke|limo|limonade|fanta|sprite|sports drink|energy ?drink|eistee|iced tea|soda|red bull|mate')],
  ['coffee', s('kaffee|coffee|cappuccino|latte|espresso|macchiato|flat white|kakao|cocoa|matcha|chai')],
  ['coffee', w('tee|tea')],
  ['beer', s('bier|(?<![a-zäöüß])beer|pils|radler|lager|hefeweizen|alkoholfreies weizen')],
  ['wine', s('(?<!sch)wein(?!traube)|wine|sekt|prosecco|champagne')],
  ['water', s('^ (?:still(?:es)? |sparkling )?(?:mineral)?(?:wasser|water)(?!melon)|mineralwasser|sprudel')],
  ['protein', s('whey|protein|shake|eiweißpulver|casein')],
  ['milk', s('milch(?!schokolade|reis)|milk(?! chocolate)|kefir|hafer ?drink|oat ?drink|soja ?drink|sahne|cream(?! cheese)|ayran')],

  // Composite dishes and snacks before their ingredients.
  ['chips', s('chips|crisps|salzstangen|popcorn|flips|nachos|reiswaffel|rice cake')],
  ['cake', s('kuchen|cake|torte|strudel|muffin|donut|doughnut|brownie|waffel|waffle|pancake|pfannkuchen|crêpe|crepe|tiramisu')],
  ['cookie', s('keks|cookie|biscuit|spekulatius|lebkuchen|cracker')],
  ['pizza', s('pizza|flammkuchen')],
  ['burger', s('burger|döner|doner|kebab|kebap|sandwich|wrap|burrito|taco|dürüm|falafel|hot ?dog')],
  ['soup', s('suppe|soup|eintopf|gulasch|chili|ramen|brühe|broth|stew')],
  ['salad', s('salat|salad|bowl|coleslaw')],
  ['sausage', s('wurst|würstchen|salami|leberkäse|sausage|chorizo|pepperoni|frankfurter|wiener|cabanossi')],
  ['fries', s('pommes|fries|kroketten|wedges|rösti|reibekuchen|kartoffelpuffer')],
  ['cereal', s('hafer|oat|müsli|muesli|granola|cornflakes|cheerios|porridge|cereal|flakes')],
  ['chocolate', s('schoko|chocolate|nougat|nutella|praline|snickers|twix|bounty')],
  ['sweets', s('gummi|bonbon|candy|lakritz|marzipan|honig|honey|konfitüre|marmelade|jam|sirup|syrup')],
  ['pastry', s('croissant|brezel|breze|pretzel|laugen|franzbrötchen|zimtschnecke|plunder|danish|bagel')],
  ['nut', s('mandel|almond|nuss|nüsse|nut(?!rition)|cashew|pistazie|pistachio|pecan|studentenfutter|trail mix|chia|leinsamen|flax|sesam|seed|samen|kerne')],

  ['egg', w('ei|eier|egg|eggs|omelett|omelette')],
  ['egg', s('rührei|spiegelei|omelet')],
  ['cheese', s('käse|kaese|cheese|gouda|emmentaler|mozzarella|feta|parmesan|cheddar|camembert|brie|halloumi|ricotta|mascarpone|cottage|edamer')],
  ['yogurt', s('joghurt|jogurt|yogurt|yoghurt|quark|skyr|pudding|dessert')],
  ['fat', s('öl(?![a-zäöüß])|butter|margarine|mayo|schmalz|ghee')],
  ['fat', w('oil')],

  ['pasta', s('nudel|pasta|spaghetti|penne|fusilli|lasagne|lasagna|makkaroni|macaroni|spätzle|maultasche|tortellini|ravioli|gnocchi|noodle|linguine|tagliatelle')],
  ['rice', s('reis|rice|risotto|quinoa|bulgur|couscous|hirse|millet|buchweizen|polenta|grieß')],
  ['sauce', s('ketchup|senf|mustard|soße|sauce|dressing|pesto|hummus|aioli|tzatziki|guacamole')],
  ['sauce', w('dip')],

  ['fish', s('lachs|salmon|thunfisch|tuna|fisch|fish|seelachs|forelle|trout|hering|makrele|mackerel|kabeljau|sushi|garnele|shrimp|prawn|scampi|krabbe|muschel|calamari|tintenfisch|sardine')],
  ['fish', w('cod')],
  ['chicken', s('hähnchen|haehnchen|hühnchen|huhn|chicken|pute|turkey|geflügel|poultry|nuggets')],
  ['meat', s('rind|beef|steak|schwein|pork|hack|mince|schnitzel|frikadelle|bulette|kotelett|braten|lamm|lamb|bacon|speck|schinken|veal|kalb|roast|meatball|fleisch|meat|jerky|gyros')],
  ['meat', w('ham')],

  ['bread', s('brot|bread|toast|brötchen|semmel|baguette|ciabatta|pumpernickel|tortilla|mehl|(?<!cauli)flour|zwieback')],
  ['bread', w('bun|buns|roll|rolls')],
  ['potato', s('kartoffel|potato|batate')],

  ['banana', s('banane|banana|plantain')],
  ['citrus', s('ananas|pineapple')],
  ['apple', s('apfel|äpfel|apple|birne|pear(?!l)|quitte')],
  ['berries', s('beere|berry|berries|traube|grape(?!fruit)|kirsch|cherr|rosine|raisin')],
  ['avocado', s('avocado')],
  ['citrus', s('orange|mandarine|clementine|zitrone|lemon|limette|grapefruit|kiwi|mango|melone|melon|pfirsich|peach|nektarine|aprikose|apricot|pflaume|plum|papaya|obst|fruit|frucht')],
  ['citrus', w('lime|fig|figs|dattel|dates')],

  ['legume', s('bohne|bean|kichererbse|chickpea|linse|lentil|erbse|tofu|tempeh|edamame|soja|soy')],
  ['legume', w('peas|pea')],
  ['tomato', s('tomate|tomato|paprika|pepper|rote bete|beet|radieschen|radish')],
  ['carrot', s('möhre|moehre|karotte|carrot|zwiebel|onion|knoblauch|garlic|mais|corn|kürbis|pumpkin|squash|ingwer|ginger|pastinake|parsnip|sellerie|celery')],
  ['greens', s('brokkoli|broccoli|spinat|spinach|kohl|kale|kraut|zucchini|gurke|cucumber|spargel|asparagus|lauch|leek|cauliflower|champignon|mushroom|pilz|aubergine|eggplant|rucola|sprout|fenchel|gemüse|vegetable|veggie')],
];

export function foodCategory(food: { name: string; source?: string; brand?: string }): FoodCategory {
  const n = ` ${food.name} `.toLowerCase();
  for (const [cat, re] of RULES) if (re.test(n)) return cat;
  return 'dish';
}

export const __rulesForTest = RULES;
