const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const tunnel = require('tunnel');
const configPath = __dirname; // console.txt和download.txt的路径 就在当前文件夹
const proxy = {
    host: 'localhost',  // 这里换成你的代理服务器地址
    port: 7890,  // 这里换成你的代理服务器端口
} // 不需要就删掉括号里面的
const rpcBaseData = {
    domain: 'http://192.168.2.222', // PRC主机
    port: '6800', // RPC端口
    path: '/jsonrpc', // RPC路径
    token: 'so3nu5zbtftulcw3mvr1t1kl7b3eelvw', // RPC密钥
    dir: 'D:\\Aria2Download', // 保存路径
}

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
 * 请求xml地址
 * @param url
 * @returns {Promise<Document>}
 */
async function fetchAndParseXml(url) {
    try {
        const response = await axios.get(url, {
            proxy: false,
            httpsAgent: tunnel.httpsOverHttp({
                proxy,
            }),
        });
        if (response.status === 200) {
            const parser = new xml2js.Parser();
            return await parser.parseStringPromise(response.data);
        } else {
            writeConsole(`请求失败： ${response.status} ， 网址：${url}`);
        }
    } catch (error) {
        console.error(error);
        writeConsole(`请求报错： ${error} ， 网址：${url}`);
    }
}

/**
 * 请求接口 返回结果第一条
 * @param downloadUrl
 * @returns {Promise<void>}
 */
async function getXML(downloadUrl) {
    let xml = await fetchAndParseXml(downloadUrl);
    if (xml?.rss?.channel[0]?.item && xml?.rss?.channel[0]?.item.length > 0) {
        return {
            name: xml?.rss?.channel[0]?.item[0].title[0],
            magnet: xml?.rss?.channel[0]?.item[0].enclosure[0].$.url
        }
    }
    return null
}

/**
 * 发送链接到aria2
 * @param filename
 * @param link
 * @returns {Promise<string>}
 */
async function sendLinkToRPC(filename, link) {
    let rpc = {
        domain: rpcBaseData.domain,
        port: rpcBaseData.port,
        path: rpcBaseData.path,
        token: rpcBaseData.token,
        dir: rpcBaseData.dir,
    };

    let url = `${rpc.domain}:${rpc.port}${rpc.path}`;
    let rpcData = {
        id: new Date().getTime(),
        jsonrpc: '2.0',
        method: 'aria2.addUri',
        params: [`token:${rpc.token}`, [link], {
            dir: rpc.dir,
            out: filename,
        }]
    };
    try {
        let res = await axios.post(url, rpcData);
        if (res.status === 200) {
            writeConsole(`${filename} 已推送`);
        } else {
            writeConsole(`${filename} 推送失败！`);
        }
    } catch (e) {
        writeConsole(`${filename} 推送失败！${e}`);
    }
}


/**
 * 初始化
 * @returns {Promise<void>}
 */
async function init() {
    writeConsole(`开始遍历下载列表`);
    const downloadText = fs.readFileSync(path.join(configPath, 'download.txt'), 'utf-8');
    // 读取 rename.txt 文件和数据
    for (const line of downloadText.split('\r\n')) {
        if (line.startsWith('#')) continue;
        if (line === "") continue;
        let [name, searchKeyWord, episode] = line.split(';');
        if (!episode) episode = 1
        let searchEpisode = String(episode > 10 ? String(episode) : String('0' + episode));
        writeConsole(`正在搜索 ${name} 的第 ${episode} 集，搜索关键词拼接为：${searchKeyWord} ${searchEpisode}`);
        let dataInfo = await getXML(`https://dmhy.anoneko.com/topics/rss/rss.xml?keyword=${searchKeyWord} ${searchEpisode}`);
        if (dataInfo) {
            writeConsole(`检索到 ${name} 已发布第 ${episode} 集，开始发送给aria2`);
            await sendLinkToRPC(dataInfo.name, dataInfo.magnet);
        } else {
            writeConsole(`没有查询到结果，建议搜索关键词`);
        }
    }
}

init();
