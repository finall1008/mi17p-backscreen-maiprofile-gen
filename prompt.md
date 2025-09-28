新建一个vue web项目，实现以下功能：
1. 根据用户选择，找到assets/frame中对应的图片。该文件夹中图片名字格式形如UI_Fram_000000.png，其中000000处可能是任意6位数字，之后当我提到“图片id”就是指这6位。将该图片裁切至976*596像素，显示在页面上。
2. 根据用户选择，找到assets/nameplate中对应id的图片，裁切至宽边为550像素，然后放置于frame图片上，使其上边和右边与frame的上边和右边分别距离均为60像素。
3. 根据用户选择的id找到assets/icon中的图片，放在plate的左侧，上、下、左边留5像素边距。
4. 在icon的右侧，靠着plate的顶部（留下和icon一样的顶边距，与icon也留5像素边距），你要绘制rating。具体地：
   1. 绘制rating背景：assets\rating_bg\UI_CMN_DXRating_01.png。
   2. rating背景图片上310像素起、578像素为止，上下各去掉20像素的矩形空间是rating数字区域。用户会输入一个最多5位的数字，将rating数字区域均分为5格，使用assets/rating_num中对应的0-9数字图片，在每个格子中绘制对应的数字，从而绘制rating。如果数字不足5位则对齐在右侧。
   3. 把整个rating部分缩放为25像素高。
5. 在rating右侧根据用户选择，绘制assets/fan_battle_class中的图片，同样缩放为25像素高，与rating间距8像素。
6. 在rating的下方，icon的右侧，绘制assets/name_bg.png图片（缩放为32像素高），然后在上面添加用户输入的用户名。注意用户名中的半角英文、数字、符号要转换为全角。
7. 在assets/name_bg.png的最右侧，根据用户选择，绘制assets/dans中的图片，缩放为28像素高，上下留下均等边距。
8. 在assets/name_bg.png的下方，icon的右侧，绘制称号。具体地：
   1. 用户会从assets/title.json中选择一个称号。该文件为以下json对象的数组：`{"name": "xxxx", "rareType": "xxxx"}`
   2. 根据rareType在assets/title中找到UI_CMN_Shougou_{rareType}.png，绘制称号背景，缩放为高17像素。
   3. 将name文字居中放置在称号背景上。
9. 提供一个下载按钮，可以将上面绘制的图片下载到本地。
10. 提供选择frame，nameplate，icon的控件，支持展开为动态加载的图片列表，同时支持输入id进行搜索。
11. 提供输入rating数字的控件，附带必要的校验。
12. 提供选择fan_battle_class和dans的控件，直接展开一个列表让用户选择图片即可。
13. 提供称号选择按钮，动态加载背景+称号文字的预览。
你的应用应该是纯静态的，同时要有现代化的ui。当前环境有node和npm可用，你可以添加任何需要的第三方库。