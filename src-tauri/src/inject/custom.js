console.log('[charles] Injected Successfully.');
import { readTextFile } from '@tauri-apps/api/fs';
import { dirname, join } from '@tauri-apps/api/path';
import { appDir } from '@tauri-apps/api/paths';

const readLicenseFile = async () => {
  try {
    // 获取应用程序目录
    const appDirectory = await appDir();
    // 获取当前脚本所在目录
    const currentDir = await dirname(appDirectory);
    // 构建license文件路径
    const licenseFilePath = await join(currentDir, 'license');
    // 读取文件内容
    const licenseContent = await readTextFile(licenseFilePath);
    console.log('License文件内容:', licenseContent);
    return licenseContent;
  } catch (error) {
    console.error('读取License文件失败:', error);
    return null;
  }
}

const publicKey = "-----BEGIN PUBLIC KEY-----\n" +
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxM0r8D9h3fmXyB2ewiwP\n" +
  "NAa8i10ls8F0gnrwikm3mICQBI+fIBUhRpC2zqx5XgTQXf2onzSbAm4Ls4AFSepQ\n" +
  "OYHvpoHaaZeKh0+hvP6PS1v5ePCLKqSKynTPcDn640e3V+ImUzCnJoAkZACWtneQ\n" +
  "M1fNgxUywXGFdOzaS0enFYp68e16wYz4/RQO6Fn5CH3pKPZjronNGgWlgS08nJwg\n" +
  "SnCxKmeRT49jH4zxFCwGTE40AsfHELvIaEpotN8DQ+pNRTu/Hn8I20gRrxWfTpm1\n" +
  "xkThRiSd6VnGryU9QNX7sMpaMQJVPwwD0cQ8aidimsavd0ulmFCvIqPQrWRczTp3\n" +
  "uwIDAQAB\n" +
  "-----END PUBLIC KEY-----";

async function verifySignature(data, signatureBase64, publicKeyBase64) {
  // 将Base64编码的公钥转换为ArrayBuffer
  const publicKeyDer = window.atob(publicKeyBase64);
  const publicKeyArrayBuffer = new Uint8Array(publicKeyDer.length);
  for (let i = 0; i < publicKeyDer.length; i++) {
    publicKeyArrayBuffer[i] = publicKeyDer.charCodeAt(i);
  }
  // 将Base64编码的签名转换为ArrayBuffer
  const signatureArrayBuffer = window.atob(signatureBase64);
  const signatureUint8Array = new Uint8Array(signatureArrayBuffer.length);
  for (let i = 0; i < signatureArrayBuffer.length; i++) {
    signatureUint8Array[i] = signatureArrayBuffer.charCodeAt(i);
  }

  // 导入公钥
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeyArrayBuffer,
    {
      name: 'RSASSA - PSS',
      hash: { name: 'SHA - 256' }
    },
    true,
    ['verify']
  );

  // 验证签名
  const isValid = await window.crypto.subtle.verify(
    {
      name: 'RSASSA - PSS',
      saltLength: 32, // 盐长度，通常为哈希函数输出长度
      hash: { name: 'SHA - 256' }
    },
    publicKey,
    signatureUint8Array,
    new TextEncoder().encode(data)
  );

  return isValid;
}

function verifyLicense(license){
  try {
    const xuzhuanwangUser = window.localStorage.getItem('xuzhuanwangUser');
    const userInfo= JSON.parse(xuzhuanwangUser);
    const uid = userInfo.userName;
    const licenseObj = JSON.parse(license);
    const licenseData = licenseObj.data;

    console.log(licenseData);
    return verifySignature(license.data,licenseObj.signature,publicKey).then((isValid)=>{
      if(isValid) {
        const currentTime = new Date().getTime();
        if (licenseData.uids.includes(uid)){
          throw new Error("License is not valid for current uuid");
        }
        if (currentTime < new Date(licenseData.startTime) || currentTime > new Date(licenseData.endTime)) {
          throw new Error('License is not valid for current time');
        }
        return {
          isValid: true,
          licenseData: licenseData
        };
      }else{
        return {
          isValid: false
        }
      }
    }).catch ( (error)=> {
      console.error(error);
      return {
        isValid: false
      };
    })
  }catch(error){
    return {
      isValid:false
    }
  }
}

const qiangDanClicker = function (){
  const qiangDanSelector = '.grabOrdersBtn';
  const buttons = document.querySelectorAll(`${qiangDanSelector}:not([data-clicked])`);
  console.log(`Found ${buttons.length} unclicked buttons matching the selector.`);
  // 遍历所有找到的按钮
  for (const button of buttons) {
    // 触发按钮的点击事件
    setTimeout(()=> {
      button.click();
      // 标记按钮为已点击
      button.setAttribute('data-clicked', 'true');
      console.log('Button clicked!');
    },0);
  }
}
// 创建 MutationObserver 实例，并传入回调函数
let isObserverRunning = false;
const observer = new MutationObserver((mutationsList) => {
  console.log('DOM change detected, checking for buttons...');

  try {
    // 遍历 mutationsList 中的每个变化记录
    for (const mutation of mutationsList) {
      // 检查变化类型是否为子节点的添加或删除
      if (mutation.type === 'childList') {
        const unhandledTab=document.querySelector('#tab-1 span i');
        if(unhandledTab && unhandledTab.textContent === '(0)'){
          qiangDanClicker();
        }else{
          console.log("Button clicker pending....")
        }
      }
    }
  } catch (error) {
    console.error('An error occurred while checking for buttons:', error);
  }
});

// 配置观察选项
const config = {
  childList: true,  // 观察子节点的添加或删除
  subtree: true     // 观察目标节点及其所有后代节点的变化
};


async function mainBasic(){
  const license = await readLicenseFile();
  if(!license) return;
  const result = verifyLicense(license);
  if(result.isValid && !isObserverRunning) {
    const orderTableDom = document.getElementById("pane-0");
    observer.observe(orderTableDom, config);
    isObserverRunning=true;
    console.log('[Charles] observer observing');
  }
  if(!result.isValid && isObserverRunning) {
    observer.disconnect()
    isObserverRunning= false;
    console.log('[Charles] observer disconnected');
  }
}

let intervalRef;

document.addEventListener('hashchange', function(e) {
  if ('#/receiveOrder' === window.location.hash) {
    mainBasic();
    intervalRef = window.setInterval(mainBasic, 60 * 1000);
  }
});
