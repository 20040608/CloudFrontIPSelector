import fetch from 'node-fetch';
import ping from 'ping';
import fs from 'node:fs';
import cliProgress from 'cli-progress';
import { isInSubnet, createChecker } from 'is-in-subnet';


"use strict"

import { BlockList } from "net"

import netmask from 'netmask';
const Netmask = netmask.Netmask;

const PING_THREADS = 300;

// Agar siz Xitoyning sharqida yashayotgan bo'lsangiz, men 50 qiymatini sinab ko'rishni maslahat beraman.
const THREASHOLD = 90;    // Agar sizda IP yo'q bo'lsa, siz ushbu qiymatni 120 ga ko'paytirishga harakat qilishingiz mumkin.


// Yangi koʻrinishni yaratish va shades_classic mavzusidan foydalanish
const terminalBarUI = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
let countOfBeingProcess = 0;


// Iltimos , ushbu URL manzilning aynan oʻsha manzilga mos kelishiga ishonch hosil qiling https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html.
//const OFFICIAL_AWS_IPs_URL = "https://d7uri8nf7uskq.cloudfront.net/tools/list-cloudfront-ips" //bu mintaqa bo'lmaganligi sababli bekor qilingan.
const OFFICIAL_AWS_IPs_URL = "https://ip-ranges.amazonaws.com/ip-ranges.json"
// bu ping natijasidagi kechikishning namunasi.
// const latencyPattern = /time=(\d+)\sms/gm;
const httpSettings = {
  method: "Get",
  headers: {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
  }
};

// U IP ma'lumotlar bazasini ushbu URL-dan massivga o'qish uchun ishlatiladi.
// u GitHub-dan olingan.
// const GEO_IP_RANGES_URL = "http://raw.githubusercontent.com/sapics/ip-location-db/master/dbip-country/dbip-country-ipv4.csv";

const GEO_IP_RANGES_URL = "./dbip-country-ipv4.csv";

let filteredIPs = [];

// ijro etilishini to'xtatish uchun ishlatiladi.
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 
async function main() {

  // Birinchi qadam: buyruq satridan mamlakat qisqa nomini o'qish. yoki andoza JP qiymatidan foydalanish.
  const args = process.argv.slice(2);
  let nationShortName = 'JP';   // Siz bu satrni SG, KR kabi davlatning qisqartmasi deb atashingiz mumkin.
  if (args.length > 0) {
    if (args.length > 1) {
      console.error("Juda ko'p bahs-tortishuvlar. Siz faqat bitta argumentni kiritishingiz mumkin, masalan 'node index.js JP' ");
      process.exit(1);
    }
    // 2 ta harfdan iborat boʻlgan mamlakat qisqartmasi nomi bilan mos keladigan regex.
    const regex = /^[A-Z]{2}$/;
    if (regex.test(args[0])) {
      nationShortName = args[0];
    }
    else {
      console.error("Argument haqiqiy millat qisqartmasi emas, masalan. 'JP' ");
      process.exit(1);
    }
  }



  try {
    // buyruq satridan berilgan mamlakatga cheklangan IP-manzillarni filtrlash uchun IP tekshiruvchisini yaratish.
    const nationalIPChecker = await extractIPRanges(nationShortName);

    console.log(`IP ranglarini olishni boshladi...`);
    //CDN IP-larini AWS-dan o'qish uchun.
    var response = await fetch(OFFICIAL_AWS_IPs_URL, httpSettings);
    const body = await response.text();
    const json = JSON.parse(body);
    if (!json.prefixes || json.prefixes.length == 0) {
      console.error("prefikslar bo'sh.");
      process.exit(1);
      return;
    }

    // ---------------- Mavjud subtarmoqlarni filtrlash ----------------
    console.log(`mavjud subtarmoqlarni filtrlashni boshladi...`);
    // Ushbu ma'lumotlar CIDR tomonidan tayyorlangan bo'lib, uning ma'lumoti bu yerda: https://datatracker.ietf.org/doc/rfc4632/.
    const arrOfIPRanges = [];
    for (let i = 0; i < json.prefixes.length; i++) {
      const item = json.prefixes[i];
      if (item.service == "CLOUDFRONT") {
        arrOfIPRanges.push(item.ip_prefix);
      }
    }

    if (arrOfIPRanges.length == 0) {
      console.error(`${OFFICIAL_AWS_IPs_URL}dan hech narsa topilmadi, yana urinib ko'rishingiz mumkin!`);
      process.exit(1);
    }
    else {
      console.log(`${arrOfIPRanges.length} subtarmog'i mavjud. IP-lar qaysi millatga tegishliligini tekshirishni boshlang. ${arrOfIPRanges.length} subtarmog'ini topdim. IP qaysi millatga tegishliligini tekshirishni boshlang.`);
    }

    for (const range of arrOfIPRanges) {
      // agar (filtrlangan IPs.uzunligi > 10000) buzilsa;
      let netmask = new Netmask(range);
      netmask.forEach(async (ip) => {
        if (nationalIPChecker.check(ip)) {
          filteredIPs.push(ip);
        }
      })
    }

    console.log(`IPs.uzunligi ${filteredIPs.length}`);
    if (filteredIPs.length < 1) {
      //chiqish 1
      process.exit(1);
    }
    // ---------------- Mavjud subtarmoqlarni filtrlash ----------------



    //--------------------------Mavjud tarmoq eshiklarini topish --------------------------
    // ochiq bo'lgan tarmoq eshiklarini filtrlash. 
    // Agar tarmoq darvozasi ochiq bo'lsa, uning orqasidagi 254 ta IP ham ochiq bo'lishi mumkin.
    // Va bu qadam ham barcha jarayon vaqtini kamaytiradi.
    console.log(`Tarmoq eshiklari ochilganini aniqlay boshladik...`);
    //tarmoq darvozasi ochiqligini aniqlash.
    const gates = [];
    const availableGates = []; // bu keyingi bosqichda ishlatilishi kerak.
    for (let i = 0; i < filteredIPs.length; i++) {
      const ip = filteredIPs[i];
      // agar ip soʻnggi satr '0' boʻlsa
      if (ip.split('.').pop() == '0') {
        gates.push(ip);
      }
    }

    console.log(`Qoʻlga olingan ${gates.length} darvozalar.`);

    for (let i = 0; i < gates.length; i++) {
      const item = gates[i];

      const addIfNeed = (latency) => {
        if (latency > 500) {
        }
        else {
          availableGates.push({ ip: item, latency });
          // console.log(item, 'lost', latency);
        }
      }
      if (i % PING_THREADS == 0 || i > gates.length - Math.min(gates.length / 10, PING_THREADS / 10)) {
        let latency = await queryAvgLatency(item);
        addIfNeed(latency);
      }
      else {
        queryAvgLatency(item).then(latency => addIfNeed(latency));
      }

    }
    console.log(`availableGates.length is ${availableGates.length}`);
    //--------------------------Mavjud tarmoq eshiklarini topish --------------------------


    //--------------------------Filtrlangan IP-larni qayta tiklash --------------------------
    filteredIPs = [];  // Ushbu massivni tozalash.
    if (filteredIPs.length > 0) {
      throw new Error("\n filtrlangan IPlar bo'sh bo'lishi kerak.");
    }
    for (let i = 0; i < availableGates.length; i++) {
      const gate = availableGates[i];
      const gatePrefix = gate.ip.substring(0, gate.ip.length - 1);

      //255 o'rniga 1 dan 125 gacha bo'lgan sonlarni qo'ying. 
      // Bu bir xil foydalanuvchi tajribasini ta'minlaydigan ba'zi IP-lardan qochishni anglatadi.
      for (let fourthPart = 1; fourthPart < 100; fourthPart++) {
        if (fourthPart < 50 || fourthPart % 4 == 0) { //vaqtni tejash uchun IPni kamaytirish.
          filteredIPs.push(gatePrefix + fourthPart);
        }
      }
    }

    console.log(`Ping qilish ${filteredIPs.length} IPs...`);

    //--------------------------Filterlangan IPlarni qayta tiklash--------------------------

    const unsortedArr = [];
    let processIndex = 0;
    const maxProcess = filteredIPs.length;


    terminalBarUI.start(maxProcess, processIndex);

    const processPrinter = setInterval(async () => {
      terminalBarUI.update(processIndex);
      console.log(`jarayon: ${processIndex}/${maxProcess}. ${unsortedArr.length} mavjud IP-larni oling.`);
    }, 1000 * 5);

    for (let i = 0; i < filteredIPs.length; i++) {
      const ip = filteredIPs[i];
      processIndex++;
      if (unsortedArr.length >= 200) {// vaqtni tejash uchun.
        console.log("Yetarlicha IP bor, pingni to'xtating.");
        break;
      }
      while (countOfBeingProcess > PING_THREADS) {
        await sleep(30);
      }

      {
        countOfBeingProcess++;
        queryAvgLatency(ip).then(function (avgLatency) {
          if (avgLatency <= THREASHOLD) {
            unsortedArr.push({ ip, latency: avgLatency });
          }
          else {
            if (avgLatency < THREASHOLD * 1.5) {
                console.warn(`${ip} ning kechikishi ${avgLatency} bo'lsa-da, men uni saqlamayman.`);
            }
          }
          countOfBeingProcess--;
        }).catch(function (e) {
          countOfBeingProcess--;
        });
      }

    }

    while (countOfBeingProcess > 5) {
      await sleep(30);
    }
    // muvaffaqiyat panelini toʻxtatish
    terminalBarUI.stop();

    console.log(`saralab bo'lmaydiganArr.length ${unsortedArr.length}`);
    // massivni latensiya bo'yicha saralash.
    let resultArr = unsortedArr
      .filter(item => (item.ip.split('.').pop() > 1)) // IP-ning so'nggi raqami, ehtimol, tarmoq darvozasi sifatida ishlatilishi mumkin, shuning uchun uni CDN IP sifatida ishlatish mumkin emas.
      .sort((a, b) => a.latency - b.latency);

    // ustuvorligi bo'yicha 100 ta IPni kesish.
    if (resultArr.length > 100) {
      resultArr = resultArr.slice(0, 200);
    }

    clearInterval(processPrinter);

    //ushbu saralab qoʻyilgan matnni 'result.txt' ga saqlash uchun.
    fs.writeFile('result.txt', JSON.stringify(resultArr), function (err) {
      if (err) return console.error(err);
    });

    const strPrefix = resultArr.length == 0 ? 'Oops' : 'Congradulations';

    console.log(`${strPrefix}! Got ${resultArr.length} IPs. `);
    if (resultArr.length == 0) {
      console.log("Siz THREASHOLDni ko'paytirishga harakat qilishingiz mumkin.");
    }

  } catch (e) {
    console.error('Kechirasiz, ', e.message);
    process.exit(1);
  }
}

setTimeout(main, 100);

async function queryLatency(ip) {
  try {
    const result = await ping.promise.probe(ip, {
      timeout: 1,
    });

    return result.alive ? Math.round(result.avg) : 1000;
  }
  catch (e) {
    console.error(`${ip} qo'lga kiritilmaydi.`, e.message);
  }
  return 1000;
}



// 1000 yoki kechikish.
async function queryAvgLatency(ip) {
  try {
    await queryLatency(ip); // bu chiziq foydasiz ko'rinadi, lekin mening fikrimcha, bu aloqa ishonchli qilish mumkin.
    const latency1 = await queryLatency(ip);
    // console.log (((${ip} kechikish vaqti1 = ${latency1}`);
    if (latency1 > THREASHOLD * 2) return latency1;

    const latency2 = await queryLatency(ip);
    // console.log (((${ip} kechikish vaqti2 = ${latency2}`);
    if (latency2 > THREASHOLD * 1.5) return latency2;


    const latency3 = await queryLatency(ip);
    // console.log (((${ip} kechikish vaqti3 = ${latency3}`);
    let result = (latency1 + latency2 + latency3) / 3

    return Math.round(result);
  }
  catch (e) {
    console.log(`${ip} is not reachable.`, e.message);
  }
  return 1000;
}



async function readTextFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    console.error(error);
  }
}

export async function extractIPRanges(shortNation) {
  let ipDB = null;
  shortNation = shortNation.toUpperCase();
  console.log('IP diapazonlarini mamlakat bilan ajratish: ' + shortNation);
  if (!ipDB) {
    console.log("Ushbu qadam katta IP DB faylini yuklab olishdir, ehtimol siz 2-3 daqiqa kutasiz. Agar u 3 daqiqadan ortiq ishlayotgan bo'lsa, uni to'xtatib, yana urinib ko'ring. ");
    var response = await fetch(GEO_IP_RANGES_URL, httpSettings);

    const body = await response.text();
    ipDB = body.split('\n');

    // lokal faylni oʻqish uchun: await bilan GEO_IP_RANGES_URL.
    ipDB = (await readTextFile(GEO_IP_RANGES_URL)).split('\n');
  }


  const blockList = new BlockList()
  let countOfRanges = 0;
  //ipDBni topib, millatning IP oralig'ini toping. ipDBdagi element quyidagicha: 13.35.0.0,13.35.7.255,TW
  ipDB.map((item, index) => {
    const split = item.split(',');
    if (split && split[2] && split[2].trim() == shortNation) {
      blockList.addRange(split[0], split[1]);
      countOfRanges++;
    }
  });

  if (countOfRanges == 0) {
    console.error(`Kechirasiz, men ${shortNation} ning ${GEO_IP_RANGES_URL} da hech qanday IP diapazonini topa olmayapman.`);
    console.error(`Bu xato bo'lishi mumkin, yoki millat: ${shortNation} butunlay noto'g'ri.`);
    process.exit(1);
  }
  return blockList;

}


export default {
  extractIPRanges
}