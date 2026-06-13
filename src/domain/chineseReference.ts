import type {
  EmotionalToneModule,
  LightingTypeModule,
  OutputModeModule,
  PhotographyProfileModule,
  PromptBuildResult,
  RatioModule,
  StyleModule,
} from "./schema";

const exactLineTranslations = new Map<string, string>([
  ["INSPIRATION SOURCES", "灵感来源"],
  ["MATERIAL TRANSLATION", "材料转译"],
  ["COLOR STRATEGY", "色彩策略"],
  ["AVOID", "避免事项"],
  ["SUBJECT PRIORITY", "主体优先级"],
  ["PHOTOGRAPHY REQUIREMENTS", "摄影要求"],
  ["GRID LAYOUT REQUIREMENTS", "四宫格布局要求"],
  ["MANUFACTURING REQUIREMENTS", "商业量产要求"],
  ["NO TEXT / NO LOGO / NO WATERMARK", "无文字 / 无 Logo / 无水印"],
  ["FINAL QUALITY REMINDER", "最终质量提醒"],
  ["EMOTIONAL IMPACT REQUIREMENTS", "情绪感染力要求"],
  ["COLOR EMOTION ADD-ON", "色彩情绪增强"],
  ["PANEL 1 EMOTION ADD-ON", "Panel 1 情绪增强"],
  ["PANEL 4 EMOTION ADD-ON", "Panel 4 情绪增强"],
  ["PHOTOGRAPHY EMOTION ADD-ON", "摄影情绪增强"],
  ["EMOTIONAL AVOID LIST", "情绪效果避免事项"],
  ["PHOTOGRAPHY PROFILE", "摄影风格模式"],
  ["COMPOSITION STYLE", "构图方式"],
  ["LIGHTING STYLE", "光线风格"],
  ["CAMERA STYLE", "相机与镜头风格"],
  ["PHOTOGRAPHIC MOOD", "摄影氛围"],
  ["PHOTOGRAPHY AVOID LIST", "摄影问题避免事项"],
  ["OUTPUT MODE", "输出方式"],
  ["OUTPUT CONSISTENCY REQUIREMENTS", "输出一致性要求"],
  ["OUTPUT LAYOUT REQUIREMENTS", "输出布局要求"],
  ["OUTPUT MODE AVOID LIST", "输出方式避免事项"],
  ["TECHNICAL OUTPUT CLARITY REQUIREMENTS", "技术输出清晰度要求"],
  ["PRODUCT IDENTITY PRIORITY", "产品识别优先级"],
  ["GLOBAL TECHNICAL OUTPUT RESTRICTIONS", "技术输出全局限制"],
  ["Original", "原创"],
  ["Manufacturable", "可制造"],
  ["Commercially viable", "具备商业可行性"],
  ["Suitable for luxury interiors", "适合高端奢华室内空间"],
  ["Suitable for social media exposure", "适合社交媒体传播"],
  ["Strong in visual identity", "具有强视觉识别度"],
  ["Ready for commercial market testing", "可用于商业市场测试"],
  ["Requirements:", "要求："],
  ["Avoid:", "避免："],
  ["Prefer:", "优先："],
  ["Examples:", "示例："],
  ["Wide shot.", "广角场景。"],
  ["Lighting OFF.", "灯具关闭。"],
  ["Macro shot.", "微距镜头。"],
  ["Reveal:", "展示："],
  ["Lamp turned ON.", "灯具点亮。"],
  ["Show:", "展示："],
  ["Material texture", "材料纹理"],
  ["Surface treatment", "表面处理"],
  ["Craftsmanship", "工艺细节"],
  ["Structural details", "结构细节"],
  ["Construction logic", "构造逻辑"],
  ["Silhouette", "轮廓"],
  ["Balance", "平衡感"],
  ["Curves", "曲线"],
  ["Geometry", "几何关系"],
  ["Proportion", "比例"],
  ["Design language", "设计语言"],
  ["Warm ambient lighting", "温暖的环境光"],
  ["Soft shadows", "柔和阴影"],
  ["Material interaction", "材料与光的互动"],
  ["Light diffusion", "光线扩散"],
  ["Poetic mood", "诗意氛围"],
  ["Emotional atmosphere", "情绪氛围"],
  ["Simple structures", "简洁结构"],
  ["Repeatable components", "可重复生产的组件"],
  ["Efficient production", "高效生产"],
  ["Reasonable assembly", "合理装配"],
  ["Strong silhouette recognition", "强轮廓识别度"],
  ["Good packaging feasibility", "良好的包装可行性"],
  ["Clear material separation", "清晰的材料分区"],
  ["Practical lighting function", "实用照明功能"],
  ["Stable mounting", "稳定安装"],
  ["Durable connections", "耐用连接"],
  ["Mass production", "量产"],
  ["Boutique production", "精品小批量生产"],
  ["Custom projects", "定制项目"],
  ["Interior design projects", "室内设计项目"],
  ["Online product testing", "线上产品测试"],
  ["Social media content", "社交媒体内容"],
  ["Commercial market launch", "商业上市"],
]);

const phraseTranslations: Array<[string, string]> = [
  [
    "Act as a world-class Luxury Lighting Designer, Conceptual Product Designer, and Industrial Design Creative Director.",
    "担任世界级奢华灯具设计师、概念产品设计师和工业设计创意总监。",
  ],
  [
    "Act as a world-class Luxury Lighting Designer specializing in",
    "担任世界级奢华灯具设计师，专注于",
  ],
  ["Create a completely original lighting product.", "创建一款完全原创的灯具产品。"],
  ["Create one original", "创建一款原创"],
  ["The product must be:", "产品必须具备："],
  ["Avoid copying existing products.", "避免复制现有产品。"],
  [
    "Avoid generic online marketplace lamp designs.",
    "避免普通电商平台上常见的泛化灯具设计。",
  ],
  ["Avoid unrealistic fantasy objects.", "避免不现实的幻想物件。"],
  [
    "The final product should look like a genuine designer lighting product ready for production, photography, social media testing, and commercial launch.",
    "最终产品应看起来像一款真正可生产、可拍摄、可用于社交媒体测试并可商业发布的设计师灯具。",
  ],
  ["Generate a single vertical image.", "生成一张竖版单图。"],
  ["Generate a single image.", "生成一张单图。"],
  ["Aspect Ratio", "图片比例"],
  [
    "The storyboard must fill the entire vertical canvas.",
    "分镜必须填满整个竖向画布。",
  ],
  ["The storyboard must fill the entire canvas.", "分镜必须填满整个画布。"],
  [
    "Suitable for Xiaohongshu, TikTok, Reels, Shorts, vertical social media content, and mobile-first product presentation.",
    "适合小红书、TikTok、Reels、Shorts、竖版社交媒体内容和移动端优先的产品展示。",
  ],
  [
    "Suitable for e-commerce product listings, product catalogs, detail pages, portfolio presentations, and commercial product display.",
    "适合电商产品列表、产品目录、详情页、作品集展示和商业产品展示。",
  ],
  [
    "The image is a product storyboard divided into a seamless 2×2 grid.",
    "画面是一个无缝 2×2 四宫格产品分镜。",
  ],
  ["All four panels must show the EXACT SAME lamp.", "四个画面必须展示同一盏完全一致的灯具。"],
  [
    "The shape, material, color, proportion, lampshade details, arms, base, mounting, and structural logic must remain completely consistent across all four panels.",
    "四个画面中的造型、材料、颜色、比例、灯罩细节、支臂、底座、安装方式和结构逻辑必须完全一致。",
  ],
  [
    "Only the camera angle, lighting condition, distance, and photographic composition may change.",
    "只能改变拍摄角度、光照状态、距离和摄影构图。",
  ],
  ["Panel 1 — Interior Context", "Panel 1 — 室内场景"],
  ["Panel 2 — Craftsmanship Detail", "Panel 2 — 工艺细节"],
  ["Panel 3 — Hero Perspective", "Panel 3 — 英雄视角"],
  ["Panel 4 — Atmosphere Scene", "Panel 4 — 点亮氛围"],
  ["The lamp is the clear primary subject of the image.", "灯具必须是画面中明确的第一主体。"],
  ["Panel 1 must prioritize the lighting product.", "Panel 1 必须优先突出灯具产品。"],
  ["The lamp should occupy a significant portion of the frame.", "灯具应占据画面中的重要比例。"],
  ["Background requirements:", "背景要求："],
  ["Slightly blurred background", "背景轻微虚化"],
  ["Soft natural bokeh", "柔和自然的焦外虚化"],
  ["Shallow depth of field", "浅景深"],
  [
    "Background elements remain recognizable but secondary",
    "背景元素可辨认，但必须处于次要地位",
  ],
  ["The environment must never compete with the lamp", "环境绝不能与灯具抢主体"],
  [
    "The lamp remains perfectly sharp and in focus.",
    "灯具必须保持完全清晰并精准对焦。",
  ],
  [
    "The viewer's attention should immediately focus on the lighting fixture.",
    "观者的注意力应立即集中在灯具上。",
  ],
  [
    "The image should feel like professional product photography rather than interior design photography.",
    "画面应像专业产品摄影，而不是室内设计摄影。",
  ],
  ["The lighting fixture is always the primary visual subject.", "灯具始终是第一视觉主体。"],
  ["In every panel:", "在每个画面中："],
  ["The lamp must remain dominant in the composition.", "灯具必须在构图中保持主导地位。"],
  ["The lamp must occupy at least 60% of visual attention.", "灯具必须占据至少 60% 的视觉注意力。"],
  [
    "The lamp must be visually larger than surrounding decorative objects.",
    "灯具在视觉上必须大于周围装饰物。",
  ],
  ["Background elements are supporting only.", "背景元素只能起辅助作用。"],
  [
    "Furniture and architecture must never overpower the product.",
    "家具和建筑元素不能压过产品。",
  ],
  ["Focus priority must always remain on the lamp.", "对焦优先级必须始终落在灯具上。"],
  [
    "The final image must look like a real-world product photography shoot captured using an iPhone 17 Pro Max.",
    "最终图像必须像使用 iPhone 17 Pro Max 拍摄的真实产品摄影。",
  ],
  ["ABSOLUTELY NO CGI RENDER LOOK.", "绝对不要 CGI 渲染感。"],
  ["ABSOLUTELY NO 3D VISUALIZATION LOOK.", "绝对不要 3D 可视化效果。"],
  ["ABSOLUTELY NO CONCEPT ART STYLE.", "绝对不要概念艺术风格。"],
  ["ABSOLUTELY NO ARCHITECTURAL RENDERING STYLE.", "绝对不要建筑渲染风格。"],
  [
    "The lamp must appear physically real and commercially photographed.",
    "灯具必须呈现真实物理存在感，并像商业摄影作品。",
  ],
  ["Shot on iPhone 17 Pro Max", "使用 iPhone 17 Pro Max 拍摄"],
  ["Real smartphone photography appearance", "真实智能手机摄影质感"],
  ["Natural HDR processing", "自然 HDR 处理"],
  ["Authentic camera optics", "真实相机光学表现"],
  ["Realistic lens behavior", "真实镜头行为"],
  ["Real-world lighting conditions", "真实世界光照条件"],
  ["Natural reflections", "自然反射"],
  ["Accurate material rendering", "准确材料呈现"],
  ["Realistic shadows", "真实阴影"],
  ["Realistic exposure", "真实曝光"],
  ["Realistic depth of field", "真实景深"],
  ["True-to-life proportions", "符合现实的比例"],
  ["True-to-life scale", "符合现实的尺度"],
  ["Professional product photography composition", "专业产品摄影构图"],
  ["Sharp focus on the product", "产品清晰对焦"],
  ["Natural background blur where appropriate", "在合适位置使用自然背景虚化"],
  ["No artificial CGI perfection", "不要人工 CGI 式完美感"],
  ["The image should resemble:", "画面应类似："],
  ["High-end interior photography", "高端室内摄影"],
  ["Luxury residential photography", "奢华住宅摄影"],
  ["Premium lighting catalog photography", "高端灯具目录摄影"],
  ["Designer home tour photography", "设计师住宅探访摄影"],
  ["High-performing Xiaohongshu home content", "高表现力的小红书家居内容"],
  ["Premium furniture brand product photography", "高端家具品牌产品摄影"],
  [
    "The lamp must look like an actual manufactured product photographed in a real environment.",
    "灯具必须像在真实环境中拍摄的实际制造产品。",
  ],
  ["CGI appearance", "CGI 外观"],
  ["Unrealistic reflections", "不真实反射"],
  ["Artificial lighting effects", "人工光效"],
  ["Overly perfect surfaces", "过度完美的表面"],
  ["Plastic-looking materials", "塑料感材料"],
  ["Unrealistic geometry", "不真实几何结构"],
  ["Unrealistic glow effects", "不真实发光效果"],
  ["Excessive bloom", "过度光晕"],
  ["Fantasy rendering style", "幻想渲染风格"],
  ["Architectural visualization style", "建筑可视化风格"],
  ["Overly polished 3D render look", "过度精致的 3D 渲染感"],
  ["Text on image", "画面文字"],
  ["Captions", "字幕"],
  ["Logos", "Logo"],
  ["Watermarks", "水印"],
  ["Labels", "标签"],
  ["No text.", "无文字。"],
  ["No logos.", "无 Logo。"],
  ["No watermark.", "无水印。"],
  ["No captions.", "无字幕。"],
  ["No labels.", "无标签。"],
  ["No captions", "无字幕"],
  ["No text", "无文字"],
  ["No labels", "无标签"],
  ["No logos", "无 Logo"],
  ["No watermark", "无水印"],
  ["No brand marks.", "无品牌标识。"],
  ["No visible UI elements.", "无可见界面元素。"],
  ["No typography inside the image.", "画面内不要出现排版文字。"],
  [
    "Every detail should withstand close inspection.",
    "每个细节都应经得起近距离检查。",
  ],
  [
    "The final result should be indistinguishable from a genuine photograph taken by a professional photographer using an iPhone 17 Pro Max.",
    "最终结果应与专业摄影师使用 iPhone 17 Pro Max 拍摄的真实照片难以区分。",
  ],
  ["Photorealism priority: Maximum.", "照片真实感优先级：最高。"],
  ["Commercial realism priority: Maximum.", "商业真实感优先级：最高。"],
  ["Manufacturing realism priority: Maximum.", "制造真实感优先级：最高。"],
  [
    "The final image must be a true seamless 2×2 storyboard layout.",
    "最终图像必须是真正无缝的 2×2 分镜布局。",
  ],
  [
    "All four panels must be arranged in a perfectly aligned grid.",
    "四个画面必须以完全对齐的网格排列。",
  ],
  ["No spacing between panels", "画面之间无间距"],
  ["No gutters", "无分栏间隔"],
  ["No margins", "无边距"],
  ["No white borders", "无白边"],
  ["No black borders", "无黑边"],
  ["No frames", "无边框"],
  ["No separators", "无分隔线"],
  ["No visible layout padding", "无可见布局内边距"],
  ["Each panel must directly touch adjacent panels.", "每个画面必须直接贴合相邻画面。"],
  [
    "The four images must be tightly merged into one seamless 2×2 grid.",
    "四张图必须紧密合成为一个无缝 2×2 网格。",
  ],
  ["The grid must occupy 100% of the canvas area.", "网格必须占据 100% 画布区域。"],
  [
    "The storyboard must fill the entire canvas from edge to edge.",
    "分镜必须从边到边填满整个画布。",
  ],
  ["The design must be commercially viable.", "设计必须具备商业可行性。"],
  ["The lamp should be suitable for:", "灯具应适合："],
  [
    "Randomly choose one inspiration source from:",
    "从以下灵感来源中随机选择一个：",
  ],
  [
    "Then select one highly specific structure, rhythm, geometry, texture, movement, proportion, or visual detail from that source.",
    "然后从该来源中选择一个高度具体的结构、节奏、几何、纹理、运动感、比例或视觉细节。",
  ],
  [
    "The inspiration should be translated into the lamp's form language, not pasted on as decoration.",
    "灵感应被转译为灯具的形态语言，而不是直接贴成装饰。",
  ],
  ["Select premium materials suitable for this style.", "选择适合该风格的高端材料。"],
  ["Possible materials include:", "可选材料包括："],
  [
    "Material combinations should feel intentional, commercially realistic, and suitable for actual lighting production.",
    "材料组合应显得有意图、商业上真实，并适合实际灯具生产。",
  ],
  ["Every material must look physically real.", "每种材料都必须具有真实物理质感。"],
  ["Use a sophisticated color palette suitable for this style.", "使用适合该风格的高级配色。"],
  ["Possible colors include:", "可选颜色包括："],
  ["Avoid random colors.", "避免随机配色。"],
  [
    "The final color composition should feel coherent, premium, and suitable for luxury interior photography.",
    "最终色彩构成应协调、高级，并适合奢华室内摄影。",
  ],
  ["Do not copy existing products.", "不要复制现有产品。"],
  ["Do not create generic online marketplace lamp designs.", "不要生成普通电商平台常见灯具设计。"],
  [
    "The final prompt must generate one complete, finished, commercially realistic lighting product storyboard.",
    "最终提示词必须生成一个完整、成熟、具有商业真实感的灯具产品分镜。",
  ],
  [
    "The selected lighting type must be explicit and physically accurate.",
    "所选灯具类型必须明确且符合物理结构。",
  ],
  ["A dramatic artistic angle emphasizing:", "使用富有戏剧性的艺术角度，强调："],
  [
    "The viewer's eye should immediately focus on the lighting fixture.",
    "观者视线应立即聚焦在灯具上。",
  ],
  ["The product must function as", "产品必须作为"],
  ["Emphasize", "重点强调"],
  ["The design should feel", "设计应呈现"],
  ["The lamp should feel", "灯具应呈现"],
  ["The structure should be suitable for", "结构应适合"],
  ["The product must be", "产品必须是"],
  [
    "Design a completely original lighting product inspired by Chinese culture, nature, philosophy, craftsmanship, architecture, poetry, and artistic traditions.",
    "设计一款完全原创的灯具产品，灵感来自中国文化、自然、哲学、工艺、建筑、诗歌和艺术传统。",
  ],
  [
    "Avoid directly copying traditional decorative symbols.",
    "避免直接复制传统装饰符号。",
  ],
  [
    "Avoid dragons, phoenixes, excessive ornamentation, generic palace lanterns, literal historical reproduction, and old-fashioned Chinese decorative clichés.",
    "避免龙凤、过度装饰、普通宫灯、直白历史复刻和老派中式装饰俗套。",
  ],
  [
    "The design should reinterpret Chinese aesthetics in a modern, elegant, collectible way.",
    "设计应以现代、优雅、具有收藏感的方式重新诠释中国美学。",
  ],
  [
    "The final design should feel quiet, poetic, refined, artistic, collectible, manufacturable, and suitable for luxury interiors.",
    "最终设计应安静、诗意、精致、艺术化、具收藏感、可制造，并适合奢华室内空间。",
  ],
  [
    "Create a completely original lighting product inspired by the spirit of Mid-Century Modern design from approximately 1945 to 1970.",
    "创建一款完全原创的灯具产品，灵感来自约 1945 至 1970 年间的 Mid-Century Modern 设计精神。",
  ],
  [
    "The design should feel as if it could have been created by an unknown MCM master designer, but reinterpreted for contemporary premium interiors.",
    "设计应像是由一位未被命名的 MCM 大师创作，但为当代高端室内空间重新演绎。",
  ],
  ["Do not copy any existing famous lamp.", "不要复制任何现有知名灯具。"],
  [
    "Avoid directly reproducing Sputnik chandeliers, George Nelson Bubble Lamps, Noguchi Akari lamps, Arco-style floor lamps, PH lamps, Serge Mouille lamps, or any other recognizable historical lighting product.",
    "避免直接复刻 Sputnik 吊灯、George Nelson Bubble 灯、Noguchi Akari 灯、Arco 风格落地灯、PH 灯、Serge Mouille 灯或任何可识别的历史经典灯具。",
  ],
  [
    "The design should express clean geometry, functional beauty, optimistic futurism, sculptural simplicity, balanced asymmetry, warm material honesty, human-scale proportions, elegant engineering, mass-production logic, and strong silhouette recognition.",
    "设计应表达清晰几何、功能美、乐观未来主义、雕塑般简洁、平衡的不对称、温暖真实的材料、人尺度比例、优雅工程感、量产逻辑和强轮廓识别度。",
  ],
  [
    "Create a completely original lighting product inspired by Bauhaus design philosophy.",
    "创建一款完全原创的灯具产品，灵感来自包豪斯设计哲学。",
  ],
  [
    "The design should express function, structure, clarity, geometry, and industrial beauty.",
    "设计应表达功能、结构、清晰性、几何关系和工业美感。",
  ],
  [
    "The final lamp should feel simple, intelligent, architectural, manufacturable, and visually iconic.",
    "最终灯具应简洁、聪明、具有建筑感、可制造，并在视觉上具有标志性。",
  ],
  ["The design should avoid decorative excess.", "设计应避免过度装饰。"],
  [
    "The design should use essential forms and reveal construction logic.",
    "设计应使用本质形态，并展现构造逻辑。",
  ],
  [
    "The beauty should come from proportion, geometry, material honesty, and functional clarity.",
    "美感应来自比例、几何、材料真实性和功能清晰度。",
  ],
  [
    "The final product should feel like a contemporary reinterpretation of Bauhaus principles rather than a historical copy.",
    "最终产品应像是对包豪斯原则的当代重新诠释，而不是历史复制。",
  ],
  [
    "Create a completely original lighting product inspired by Light French elegance.",
    "创建一款完全原创的灯具产品，灵感来自轻法式优雅。",
  ],
  [
    "The design should feel romantic, soft, graceful, refined, feminine but not childish, luxurious but not heavy.",
    "设计应浪漫、柔和、优雅、精致，带有女性气质但不幼稚，奢华但不沉重。",
  ],
  [
    "Avoid overly ornate classical French reproduction.",
    "避免过度繁复的古典法式复刻。",
  ],
  ["Avoid heavy palace style.", "避免厚重宫廷风。"],
  ["Avoid excessive carving and gold decoration.", "避免过度雕花和金色装饰。"],
  [
    "The final product should reinterpret French elegance in a contemporary, light, airy, and commercially viable way.",
    "最终产品应以当代、轻盈、通透且商业可行的方式重新诠释法式优雅。",
  ],
  [
    "Create a completely original lighting product that blends Light French elegance with Wabi-Sabi aesthetics.",
    "创建一款完全原创的灯具产品，将轻法式优雅与侘寂美学融合。",
  ],
  [
    "The design should feel soft, quiet, imperfect, poetic, tactile, natural, refined, romantic, and suitable for luxury interiors.",
    "设计应柔和、安静、不完美、诗意、触感丰富、自然、精致、浪漫，并适合奢华室内空间。",
  ],
  [
    "Avoid making the product look like a Japanese temple object.",
    "避免让产品看起来像日本寺庙器物。",
  ],
  [
    "Avoid literal Zen symbols.",
    "避免直白的禅意符号。",
  ],
  [
    "The final design should merge French softness with natural imperfection in a subtle and commercially realistic way.",
    "最终设计应以细腻且商业真实的方式，将法式柔美与自然不完美融合。",
  ],
  [
    "Create a completely original lighting product that seamlessly blends the romantic softness of Light French design with the quiet elegance of Contemporary Chinese aesthetics.",
    "创建一款完全原创的灯具产品，将轻法式设计的浪漫柔和与新中式美学的安静优雅无缝融合。",
  ],
  [
    "The result should feel timeless, refined, artistic, poetic, serene, romantic, and suitable for luxury interiors.",
    "结果应具有永恒感、精致感、艺术感、诗意、宁静、浪漫，并适合奢华室内空间。",
  ],
  ["Avoid direct historical reproduction.", "避免直接历史复刻。"],
  [
    "Avoid simply making the product look half Chinese and half French.",
    "避免简单做成一半中式、一半法式的拼贴设计。",
  ],
  [
    "The two inspirations must merge naturally into one coherent new design language.",
    "两种灵感必须自然融合成一种统一的新设计语言。",
  ],
  [
    "Create one original Chandelier.",
    "创建一款原创吊灯。",
  ],
  [
    "Create one original Pendant Lamp.",
    "创建一款原创单头吊灯。",
  ],
  [
    "Create one original Kitchen Island Pendant.",
    "创建一款原创岛台吊灯。",
  ],
  [
    "Create one original Linear Kitchen Island Chandelier.",
    "创建一款原创线性岛台吊灯。",
  ],
  [
    "Create one original Wall Sconce.",
    "创建一款原创壁灯。",
  ],
  [
    "Create one original Table Lamp.",
    "创建一款原创台灯。",
  ],
  [
    "Create one original Floor Lamp.",
    "创建一款原创落地灯。",
  ],
  [
    "Create one original Ceiling Fixture.",
    "创建一款原创吸顶灯。",
  ],
  [
    "The same lamp must remain consistent across all four panels.",
    "同一盏灯必须在四个画面中保持一致。",
  ],
  [
    "The design must feel original, premium, manufacturable, and ready for market testing.",
    "设计必须具有原创感、高级感、可制造性，并准备好进行市场测试。",
  ],
  [
    "The output must be a single seamless 2×2 grid image with photorealistic product photography quality.",
    "输出必须是一张无缝 2×2 四宫格图像，具备照片级产品摄影质量。",
  ],
];

export function buildChinesePromptReference(
  prompt: PromptBuildResult,
  style: StyleModule,
  lightingType: LightingTypeModule,
  ratio: RatioModule,
  outputMode?: OutputModeModule,
  emotionalTone?: EmotionalToneModule,
  photographyProfile?: PhotographyProfileModule,
): string {
  const translatedPrompt = translatePromptText(prompt.promptText, [
    [style.englishName, style.displayName],
    [lightingType.englishName, lightingType.displayName],
    [ratio.displayName, ratio.displayName],
    ...(outputMode
      ? ([[outputMode.englishName, outputMode.displayName]] as Array<[string, string]>)
      : []),
    ...(emotionalTone && emotionalTone.id !== "none"
      ? ([[emotionalTone.englishName, emotionalTone.displayName]] as Array<[string, string]>)
      : []),
    ...(photographyProfile
      ? ([
          [photographyProfile.englishName, photographyProfile.displayName],
        ] as Array<[string, string]>)
      : []),
  ]);

  return formatChinesePromptReference(translatedPrompt);
}

export function formatChinesePromptReference(translatedPrompt: string): string {
  return [
    "【中文参考稿】",
    "说明：以下内容由当前英文提示词即时翻译，仅供理解、沟通和内部审阅；系统不会把中文写入 JSON / MD 数据文件。正式生图建议优先使用英文提示词。",
    "",
    translatedPrompt,
  ].join("\n");
}

export function translateToChineseReference(
  text: string,
  dynamicTranslations: Array<[string, string]> = [],
): string {
  return translatePromptText(text, dynamicTranslations);
}

function translatePromptText(
  promptText: string,
  dynamicTranslations: Array<[string, string]>,
): string {
  const replacements = [...dynamicTranslations, ...phraseTranslations].sort(
    (a, b) => b[0].length - a[0].length,
  );

  return promptText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      const exact = exactLineTranslations.get(trimmed);
      if (exact) return preserveIndent(line, exact);

      return preserveIndent(line, applyPhraseTranslations(trimmed, replacements));
    })
    .join("\n");
}

function applyPhraseTranslations(text: string, replacements: Array<[string, string]>): string {
  return replacements.reduce(
    (nextText, [english, chinese]) => nextText.split(english).join(chinese),
    text,
  );
}

function preserveIndent(original: string, translated: string): string {
  const indentation = original.match(/^\s*/)?.[0] ?? "";
  return `${indentation}${translated}`;
}
