CloudFrontIPS
Ushbu loyiha tezkor va past kechikish bilan bog'lanish uchun eng yaxshi CloudFront IP-larini tanlashda yordam beradi.
AWS-ning DNS funktsiyasi juda yaxshi bo'lganligi sababli, AWS CloudFront foydalanuvchilari odatda juda barqaror tajribaga ega ekanliklarini bildiradilar.
Boshqa tomondan, Xitoyda yashayotganlar uni tez-tez ishlatishadi vaqt o'tishi, yuklarni yo'qotish va yuqori kechikish. Natijada, ba'zi odamlar past kechikish IP-manzillar yordamida CloudFront domenlariga bog'lanishni afzal ko'rishadi. Men ushbu skriptni ushbu vaziyatlarda eng past kechikish bilan IP-ni tanlash uchun yaratdim.
Qanday foydalanish kerak?
Uzel muhitini oʻrnatish
Agarda odamlar node o'rnatmagan bo'lsa. Men NVM yoki NVM-dirozalarni o'rnatishni tavsiya qilaman.
Barqaror tarmoq muhitiga ulanish
Iltimos, WIFI aloqasi beqaror bo'lganda, kompyuteringiz va router o'rtasida uzoqroq kechikish bo'lishi mumkinligini unutmang. Bu skanerlash jarayoniga salbiy ta'sir ko'rsatishi va natijalarning aniqligiga ta'sir qilishi mumkin.
Internet simini kompyuteringizga ulash tavsiya etiladi, aks holda WIFI aloqangiz barqaror ekanligiga ishonch hosil qilishingiz kerak. Barqaror ulanish bo'lmaganda, ushbu skript hech qanday IP-ni olish imkoniyatiga ega bo'lmasligi mumkin. WIFI aloqangiz barqarorligini bilish uchun eshik IP-ni pinglash kerak. 192.168.0.1 yoki 192.168.50.1, bu sizning mahalliy IP-manzilingizga bog'liq, uning oxirgi raqami 1-ga o'zgardi. Yoki noutbukni routerga yaqinlashtiring.
Ushbu JS faylini ishga tushiring.
 
26-rasm. JS faylni ishga tushurish uchun kerak 
" Siz SG kabi mamlakat qisqa nomi bilan IP-ni topishni xohlaysiz, siz "node" ni ishga tushirishingiz mumkin. / SG "
Eng yaxshi IP manzillari mavjud boʻlgan result.txt faylini olish uchun bir necha daqiqa kuting.
Bundan tashqari
a. Men tanlangan IP-larning kechikish vaqtini 80 dan past bo'lishi kerakligini chekladim, agar uni o'zgartirishni istasangiz, index.js-da THREASHOLD o'zgaruvchisini o'zgartira olasiz.
b. Gcore-CDNni sinab ko'rdingizmi? Men Gcore uchun yana bir IP-selektor yozganman: https://github.com/20040608/GcoreCDNIPSelector, siz uni sinab ko'rishingiz mumkin.
c. Nima uchun yuqoriga / pastga tezlikni kod bilan sinab ko'rmayapman? Men uni boshqa usul bilan sinab ko'rdim va Cloudfront-ning barcha IP-lari juda yuqori tezlikka ega ekanligini topdim. Natijada, turli IPlarning har xil tezligi borligini ko'rsatadigan dalillar yo'q. Boshqacha qilib aytganda, mening fikrimcha, siz ulanadigan CDN IP-ning past kechikishi bo'lishi kerak.
 
27-rasm. Ishlashidan namuna
