# Memory Orbs 使用指南

Memory Orbs 是一个 Obsidian 心情可视化插件。它会读取日记中的心情标签，把日常记录变成发光的记忆球，并支持按日、周、月查看。

如果你想最快体验完整效果，推荐先使用骰子的示例库。示例库已经配置好日记模板、心情标签、万年历和 Memory Orbs 插件；如果你已经有自己的 Obsidian 库，也可以通过 BRAT 安装这个插件。

## 1. 推荐方式：使用示例库

打开示例库页面，下载 zip 并解压，然后用 Obsidian 打开解压后的文件夹。第一次打开时，Obsidian 会询问是否信任这个库、是否启用社区插件，选择信任并启用即可。

示例库中的日记路径默认是：

```text
01. Daily/Day
```

如果日记无法自动创建，打开 Templater 设置，确认模板目录是：

```text
Template
```

日记模板在：

```text
Template/日记模版.md
```

## 2. 在日记里写心情标签

插件依赖标签识别心情。你可以在日记中这样记录：

```markdown
- 今天组会讲得很顺利，终于把卡住的问题说明白了。 #Note/life/mood/Joy #Note/life/mood/Core
- 改代码时发现一个很久以前留下的 bug，有点尴尬。 #Note/life/mood/Embarrassed
```

常用标签：

```text
#Note/life/mood/Joy
#Note/life/mood/Sad
#Note/life/mood/Fear
#Note/life/mood/Angry
#Note/life/mood/Disgust
#Note/life/mood/Anxiety
#Note/life/mood/Envy
#Note/life/mood/Embarrassed
#Note/life/mood/Ennui
#Note/life/mood/Nostalgia
#Note/life/mood/Core
```

一条记录最多支持 3 个心情标签。带 `Core` 的记录会显示为核心记忆球。

## 3. 打开 Memory Orbs

启用插件后，Obsidian 左侧会出现星星图标。点击星星图标即可打开主界面。

主界面支持：

- 悬停记忆球，查看对应事件。
- 拖动记忆球，体验物理碰撞效果。
- 刷新当前页面，重新读取日记。
- 切换日、周、月视图。
- 切换四种视觉主题。
- 查看统计面板，了解核心记忆数量和情绪分布。
- 点击彩色情绪点，筛选近 30 天对应情绪的记录。

未激活时只显示当天记忆球；激活后可以使用完整时间范围。

## 4. 跳转回日记

按住快捷键点击记忆球，可以跳转回原始日记：

- macOS：`Command + 点击`
- Windows：`Control + 点击`

## 5. 收起 UI

主界面有收起按钮。收起后会隐藏部分工具栏和说明元素，只保留更简洁的记忆球视图。这个模式适合把插件放在 Obsidian 侧边栏里长期显示。

## 6. 插件设置

在 Obsidian 设置中打开 Memory Orbs，可以调整：

- 日记目录
- 心情标签前缀
- 核心记忆标签
- 记忆球间距
- 多排管道间距
- 字体大小
- 主题
- 情绪角色、颜色和标签 key

默认日记目录：

```text
01. Daily/Day
```

默认心情标签前缀：

```text
#Note/life/mood/
```

如果你想添加新情绪，例如“灵感”，可以在设置中新增：

```text
key: Inspiration
label: 灵感
character: 灵感小宝
color: 选择一个喜欢的颜色
```

之后在日记中使用：

```text
#Note/life/mood/Inspiration
```

刷新插件后就能看到新的情绪球。

## 7. 通过 BRAT 安装和自动更新

如果你想在自己的 Obsidian 库里安装 Memory Orbs，推荐使用 BRAT。

1. 在 Obsidian 社区插件市场安装并启用 BRAT。
2. 打开 BRAT 设置。
3. 点击 `Add Beta plugin`。
4. 输入仓库地址：

```text
https://github.com/HouSiyuan2001/memory-orbs-user
```

5. 下载完成后，在社区插件列表中启用 Memory Orbs。

以后插件更新时，BRAT 可以帮助你拉取新版本。

## 8. 嵌入到笔记

Memory Orbs 支持代码块嵌入。你可以把它放进周记、月度总结或个人主页：

````markdown
```memory-orbs
view: week
theme: classic
```
````

这会在当前笔记中显示对应时间范围内的记忆球。

## 9. 用 AI 辅助记录

如果你不想每天手动整理日记，可以让 AI 帮你把聊天内容写成 Memory Orbs 识别的格式。你只需要告诉 AI：

- Obsidian 库路径
- 日记文件路径
- 今天发生了什么
- 希望使用哪些心情标签

示例提示：

```text
请把今天这件开心的事写进我的日记，使用 Memory Orbs 的标签格式：
今天和同学讨论后终于想清楚了一个推导问题，感觉很有成就感。
```

可以生成：

```markdown
- 今天和同学讨论后终于想清楚了一个推导问题，感觉很有成就感。 #Note/life/mood/Joy #Note/life/mood/Core
```

写入日记后刷新插件即可看到新的记忆球。

## 10. 常见问题

如果插件界面没有出现，检查 Memory Orbs 是否已经在社区插件列表中启用。

如果没有读到记忆球，检查日记目录、标签前缀和标签大小写是否与设置一致。

如果 BRAT 无法更新，检查仓库地址是否填写正确。

如果想使用完整功能，需要在插件设置中输入激活码。
