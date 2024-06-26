const fs = require('fs');
const path = require('path');

// 定义路径和变量
const filePath = process.argv[process.argv.length - 1];
const videoName = path.basename(filePath);
const configPath = __dirname; // console.txt和rename.txt的路径 就在当前文件夹
const mediaPath = "E:\\追番";// 文件最终移动到的文件夹
/**
 * 定义函数以写入 console.txt
 * @param text
 */
function writeConsole(text) {
    const timestamp = new Date().toLocaleString().replace(/T/, ' ').replace(/\..+/, ''); // 删除 'T' 和毫秒
    const filePath = path.join(configPath, 'console.txt');
    fs.appendFileSync(filePath, `${timestamp}: ${text}\n`, 'utf8');
}

/**
 * 通过正则查找匹配的集数
 * @param title
 * @returns {*|boolean}
 */
function extractEpisodeNumber(title) {
    // 首先定义匹配集数的正则表达式，这里我们考虑数字前后可能有不同的字符，例如空格、方括号等
    const regexPatterns = [
        /\[(\d{1,4})(?![\d.])]/, // 匹配如 [01], [12], [782] 形式的集数，但不是日期或分辨率
        /(\d{1,4})(v\d)(?!\w)/, // 匹配如 01v2, 782v1 形式的集数，确保其后没有其他字母
        /\s(\d{2,4})\s/ // 匹配两侧有空格的集数，允许是两位数或三、四位数
    ];

    // 尝试正则表达式，直到找到匹配项
    for (const pattern of regexPatterns) {
        const match = title.match(pattern);
        if (match && match[1]) { // 如果找到匹配项并且确实捕获到了集数
            return Number(match[1]); // 返回集数
        }
    }

    // 如果所有方法都失败了，返回一个错误消息
    return false;
}

/**
 * 判断是否是视频
 * @param fileName
 * @returns {boolean}
 */
function isVideoFile(fileName) {
    // 定义视频文件的扩展名列表
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv'];
    // 使用 path 模块获取文件的扩展名
    const extension = path.extname(fileName).toLowerCase();
    // 检查扩展名是否在已知的视频文件扩展名列表中
    return videoExtensions.includes(extension);
}

/**
 * 判断路径是否是文件夹，如果不是文件夹，则输出后停止，如果没有东西，则新建文件夹
 * @param allPath
 */
function hasOrIsFolder(allPath) {
    if (fs.existsSync(allPath)) {
        const stats = fs.statSync(allPath);
        if (stats.isDirectory()) {
            return true;
        }
        writeConsole(`${allPath} 已经是一个文件而不是文件夹`);
    } else {
        try {
            fs.mkdirSync(allPath, {recursive: true});
            return true;
        } catch (err) {
            writeConsole(`创建文件夹失败 请检查权限 ${allPath}`);
        }
    }
    return false;
}


/**
 * 修改集数 下载列表里面的集数需要修改
 */
function changeDownloadEpisode(name, newEpisode) {
    const downloadText = fs.readFileSync(path.join(configPath, 'download.txt'), 'utf-8');
    // 读取 rename.txt 文件和数据
    let downloadTextLines = downloadText.split('\r\n');
    let hasMatchedName = false;
    downloadTextLines = downloadTextLines.map(line => {
        if (line.startsWith('#')) return line;
        let [downloadName, episode] = line.split(';');
        if (downloadName === name) {
            hasMatchedName = true;
            writeConsole(`修改download.txt中的 ${downloadName} 集数，从${episode}修改为${newEpisode}`);
            return `${downloadName};${newEpisode ? newEpisode : 1}`;
        }
        return line;
    });
    if (!hasMatchedName) {
        console.log(`未匹配 ${name} 对应的名称`);
    }
    fs.writeFileSync(path.join(configPath, 'download.txt'), downloadTextLines.join('\r\n'), 'utf-8');
}


function init() {
    // 开始逻辑部分
    writeConsole("---------------------------------------------------------");
    writeConsole(JSON.stringify(process.argv));

    if (!isVideoFile(videoName)) {
        writeConsole(`不是视频文件，不处理`);
        return;
    }
    writeConsole(`开始处理 ${videoName}`);

    // 提取集数
    let episode = extractEpisodeNumber(videoName);
    if (!episode) {
        writeConsole(`没有检测到集数，不处理`);
        return;
    }
    writeConsole(`分辨为第${episode}集，开始下一步`);

    // 读取 rename.txt 文件和数据
    const renameText = fs.readFileSync(path.join(configPath, 'rename.txt'), 'utf-8');
    let isOk = false; // 是否匹配成功
    for (const line of renameText.split('\r\n')) {
        if (line.startsWith('#')) continue;
        if (line === "") continue;
        let [name, binder, season, difference] = line.split(';');
        let nameList = [];
        if (name.startsWith("[") && name.endsWith("]")) {
            // 可能是数组表示
            // 去掉开头和结尾的方括号，然后尝试解析为数组
            const content = name.slice(1, -1).trim(); // 去掉方括号并去除首尾空格
            try {
                const arrayData = JSON.parse("[" + content + "]");
                if (Array.isArray(arrayData)) {
                    nameList = arrayData
                } else {
                    nameList = [name]
                }
            } catch (error) {
                nameList = [name]
            }
        } else {
            // 可能是纯文本
            nameList = [name];
        }
        if (!season) {
            season = "01"
        }
        if (!difference) {
            difference = 0
        }
        // 如果文件名包含 name
        if (nameList.some(item => videoName.toLowerCase().includes(item.toLowerCase()))) {
            isOk = true;
            writeConsole(`被匹配上，该条记录【${line}】`);
            // 如果有差值 则将差值相减 比如动漫是27集对应S02E02 那么difference写25 就是填第一季的最后一集的集数
            let diffEpisode = episode;
            if (difference) {
                diffEpisode = diffEpisode - difference;
            }
            // 重命名文件
            const new_filename = `S${season}E${diffEpisode > 9 ? String(diffEpisode) : ('0' + diffEpisode)} - ${videoName}`;
            writeConsole(`重命名为 ${new_filename}`);
            // 合并目录 检测是否有目标是否有文件夹
            let allPath = path.join(mediaPath, binder, Number(season) > 1 ? `S${season}` : '');
            let allPathHasFolder = hasOrIsFolder(allPath);
            if (allPathHasFolder) {
                let targetPath = path.join(allPath, new_filename);
                writeConsole(`开始复制，移动后路径与文件名【${targetPath}】，原路径为【${filePath}】`);
                fs.copyFile(filePath, targetPath, (err) => {
                    if (err) {
                        writeConsole('发生错误:', err);
                    } else {
                        // 下载完毕后，将download.txt内的同名文件的集数加1
                        changeDownloadEpisode(binder, episode);
                        writeConsole(`复制完毕，开始删除原始文件`);
                        fs.unlinkSync(filePath);
                        writeConsole(`删除原始文件`);
                    }
                });
            } else {
                writeConsole(`路径创建错误:${allPath}`);
            }
            break;
        }
    }
    if (!isOk) {
        writeConsole(`${videoName} 没有被匹配上`);
    }
}

init();
