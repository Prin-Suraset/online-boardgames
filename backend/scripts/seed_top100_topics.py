#!/usr/bin/env python3
"""Build the curated Top 1-100 game bank from ten editable ranked lists.

The first two starter lists are preserved in top100_starter_topics.json. Rankings are
editorial game prompts, not claims of measured popularity or box office totals.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


BANK = Path(__file__).resolve().parents[1] / "app/engine/games/data/top100_topics.json"
STARTER = Path(__file__).with_name("top100_starter_topics.json")

# Each line is a ranked display name, followed by optional Thai/English aliases.
RAW_TOPICS: dict[str, tuple[str, str]] = {
    "thai_movies": ("Top 100 หนังไทยระดับตำนาน", """
พี่มาก..พระโขนง|Pee Mak|พี่มาก
ชัตเตอร์ กดติดวิญญาณ|Shutter|ชัตเตอร์
ฉลาดเกมส์โกง|Bad Genius
แฟนฉัน|My Girl
สัปเหร่อ|The Undertaker
หลานม่า|How to Make Millions Before Grandma Dies
องค์บาก|Ong-Bak
ต้มยำกุ้ง|The Protector
บางระจัน|Bang Rajan
สิ่งเล็กเล็กที่เรียกว่ารัก|A Little Thing Called Love
กวน มึน โฮ|Hello Stranger
รถไฟฟ้า มาหานะเธอ|Bangkok Traffic Love Story
ลัดดาแลนด์|Laddaland
นางนาก|Nang Nak
โหมโรง|The Overture
เด็กหอ|Dorm
รักแห่งสยาม|Love of Siam
เพื่อนสนิท|Dear Dakanda
บุปผาราตรี|Buppah Rahtree
4 แพร่ง|4bia
5 แพร่ง|Phobia 2
โปรแกรมหน้า วิญญาณอาฆาต|Coming Soon
บอดี้ ศพ 19|Body 19
คน ผี ปีศาจ|Art of the Devil
ลองของ|Art of the Devil 2
แฝด|Alone
สายลับจับบ้านเล็ก|The Bedside Detective
ห้าแถว|5 Star
ไอฟาย..แต๊งกิ้ว..เลิฟยู้|I Fine Thank You Love You
ATM เออรัก..เออเร่อ|ATM Er Rak Error
พี่ชาย My Bromance|My Bromance
ฟรีแลนซ์..ห้ามป่วย ห้ามพัก ห้ามรักหมอ|Heart Attack
ฮาวทูทิ้ง..ทิ้งอย่างไรไม่ให้เหลือเธอ|Happy Old Year
ตุ๊ดซี่ส์ แอนด์ เดอะเฟค|Tootsies and the Fake
ไทบ้านเดอะซีรีส์|Thi Baan The Series
ไทบ้านเดอะซีรีส์ 2.1|Thi Baan 2.1
ไทบ้านเดอะซีรีส์ 2.2|Thi Baan 2.2
ฮักนะสารคาม|Hug Na Sarakham
บั้งไฟสไลเดอร์|Rocket Slider
มนต์รักทรานซิสเตอร์|Monrak Transistor
ฟ้าทะลายโจร|Tears of the Black Tiger
เรื่องตลก 69|6ixtynin9
สุดเสน่หา|Blissfully Yours
สัตว์ประหลาด!|Tropical Malady
แสงศตวรรษ|Syndromes and a Century
ลุงบุญมีระลึกชาติ|Uncle Boonmee Who Can Recall His Past Lives
รักที่ขอนแก่น|Cemetery of Splendour
มะลิลา|Malila The Farewell Flower
อนธการ|The Blue Hour
กระเบนราหู|Manta Ray
ป๊อปอาย มายเฟรนด์|Pop Aye
ดาวคะนอง|By the Time It Gets Dark
Mary Is Happy, Mary Is Happy|แมรี่ อิส แฮปปี้
อวสานโลกสวย|Grace
คืนยุติ-ธรรม|The Last 10 Years
เฉือน|Slice
ฝนตกขึ้นฟ้า|Headshot
36|Thirty Six
Snap แค่...ได้คิดถึง|Snap
Die Tomorrow|พรุ่งนี้ตาย
เพื่อน..ที่ระลึก|The Promise
One for the Road|วันสุดท้าย..ก่อนบายเธอ
Where We Belong|ที่ตรงนั้น มีฉันหรือเปล่า
Homestay|โฮมสเตย์
The Medium|ร่างทรง
ธี่หยด|Death Whisperer
ธี่หยด 2|Death Whisperer 2
หอแต๋วแตก|Hor Taew Tak
หอแต๋วแตก แหกกระเจิง|Hor Taew Tak 2
หอแต๋วแตก แหกมว๊ากมว๊าก|Hor Taew Tak 3
สาระแนสิบล้อ|Saranae Sib Lor
สาระแนห้าวเป้ง|Saranae Hao Peng
แหยมยโสธร|Yam Yasothon
แหยมยโสธร 2|Yam Yasothon 2
แหยมยโสธร 3|Yam Yasothon 3
มือปืน/โลก/พระ/จัน|Killer Tattoo
บอดี้การ์ดหน้าเหลี่ยม|The Bodyguard
บอดี้การ์ดหน้าเหลี่ยม 2|The Bodyguard 2
สารวัตรหมาบ้า|The Cop
ขุนพันธ์|Khun Pan
ขุนพันธ์ 2|Khun Pan 2
ขุนพันธ์ 3|Khun Pan 3
ตำนานสมเด็จพระนเรศวรมหาราช|King Naresuan
สุริโยไท|The Legend of Suriyothai
ขุนแผน ฟ้าฟื้น|Khun Phaen Begins
พันท้ายนรสิงห์|Pan Thai Norasing
ทวิภพ|The Siam Renaissance
แม่นาคพระโขนง|Mae Nak Phra Khanong
น้ำพริกลงเรือ|Nam Prik Long Ruea
รัก 7 ปี ดี 7 หน|Seven Something
เกรียน ฟิคชั่น|Grean Fictions
ฤดูที่ฉันเหงา|Love in the Rain
ซักซี้ด ห่วยขั้นเทพ|SuckSeed
ปิดเทอมใหญ่ หัวใจว้าวุ่น|Hormones
เมย์ไหน..ไฟแรงเฟร่อ|May Who
มิสเตอร์เฮิร์ท มือวางอันดับเจ็บ|Mr Hurt
ไบค์แมน ศักรินทร์ตูดหมึก|Bikeman
อีเรียมซิ่ง|E Riam Sing
แอน|Faces of Anne
แมนสรวง|Man Suang
"""),
    "thai_games": ("Top 100 เกมที่คนไทยชอบเล่น", """
Arena of Valor|RoV|อารีน่าออฟเวเลอร์
Free Fire|ฟีฟาย
Genshin Impact|เกนชิน
Valorant|วาโลแรนต์
Grand Theft Auto V|GTA V|จีทีเอห้า
Minecraft|มายคราฟ
Seven Knights|เซเว่นไนท์
PUBG: Battlegrounds|PUBG|พับจี
Mobile Legends: Bang Bang|MLBB|โมบายเลเจนด์
Roblox|โรบล็อกซ์
League of Legends|LoL|ลีกออฟเลเจนด์
Counter-Strike 2|CS2|เคาน์เตอร์สไตรค์สอง
Dota 2|โดต้า 2
FIFA Online 4|FC Online|ฟีฟ่าออนไลน์
EA Sports FC 25|FC25|เอฟซี 25
The Sims 4|เดอะซิมส์ 4
Stardew Valley|สตาร์ดิววัลเลย์
Among Us|อะมองอัส
Pokémon GO|Pokemon Go|โปเกมอนโก
Call of Duty: Mobile|COD Mobile|คอลออฟดิวตี้โมบาย
Call of Duty: Warzone|Warzone|วอร์โซน
Fortnite|ฟอร์ตไนต์
Apex Legends|เอเพ็กซ์เลเจนด์
Overwatch 2|โอเวอร์วอตช์ 2
Honkai: Star Rail|ฮอนไคสตาร์เรล
Honkai Impact 3rd|ฮอนไคอิมแพค
Zenless Zone Zero|ZZZ|เซนเลสโซนซีโร่
Wuthering Waves|วูเธอริงเวฟส์
Ragnarok Online|RO|แร็กนาร็อกออนไลน์
Ragnarok M: Eternal Love|RO M|แร็กนาร็อกเอ็ม
MapleStory|เมเปิลสตอรี่
Audition Online|ออดิชั่นออนไลน์
Point Blank|พอยต์แบลงก์
Special Force|สเปเชียลฟอร์ซ
CrossFire|ครอสไฟร์
Warcraft III|วอร์คราฟต์สาม
World of Warcraft|WoW|เวิลด์ออฟวอร์คราฟต์
Hearthstone|ฮาร์ธสโตน
Teamfight Tactics|TFT|ทีมไฟต์แท็กติกส์
Auto Chess|ออโต้เชส
Dead by Daylight|DBD|เดดบายเดย์ไลต์
Identity V|ไอเดนติตี้ไฟว์
Phasmophobia|แฟสโมโฟเบีย
Lethal Company|ลีธัลคอมพานี
The Forest|เดอะฟอเรสต์
Sons of the Forest|ซันส์ออฟเดอะฟอเรสต์
Palworld|พาลเวิลด์
Terraria|เทอร์ราเรีย
Don't Starve Together|ดอนต์สตาร์ฟทูเกเธอร์
Fall Guys|ฟอลกายส์
Human: Fall Flat|ฮิวแมนฟอลแฟลต
It Takes Two|อิทเทกส์ทู
Overcooked! 2|โอเวอร์คุก 2
PlateUp!|เพลตอัป
Pico Park|พิโกพาร์ก
Goose Goose Duck|กูสกูสดัก
Sea of Thieves|ซีออฟธีฟส์
Raft|ราฟต์
Rust|รัสต์
ARK: Survival Evolved|อาร์กเซอร์ไววัล
The Witcher 3: Wild Hunt|เดอะวิตเชอร์สาม
Elden Ring|เอลเดนริง
Sekiro: Shadows Die Twice|เซกิโร
Dark Souls III|ดาร์กโซลส์สาม
Bloodborne|บลัดบอร์น
Black Myth: Wukong|แบล็กมิธหงอคง
Monster Hunter: World|มอนสเตอร์ฮันเตอร์เวิลด์
Monster Hunter Rise|มอนสเตอร์ฮันเตอร์ไรส์
Resident Evil 4|เรซิเดนต์อีวิลสี่
Resident Evil Village|เรซิเดนต์อีวิลวิลเลจ
The Last of Us|เดอะลาสต์ออฟอัส
Red Dead Redemption 2|เรดเดดรีเดมป์ชันสอง
Cyberpunk 2077|ไซเบอร์พังก์
Hogwarts Legacy|ฮอกวอตส์เลกาซี
Baldur's Gate 3|บัลเดอร์สเกตสาม
The Legend of Zelda: Breath of the Wild|เซลด้าเบรธออฟเดอะไวลด์
The Legend of Zelda: Tears of the Kingdom|เซลด้าเทียร์สออฟเดอะคิงดอม
Super Mario Odyssey|ซูเปอร์มาริโอโอดิสซีย์
Mario Kart 8 Deluxe|มาริโอคาร์ตแปด
Animal Crossing: New Horizons|แอนิมอลครอสซิง
Pokémon Scarlet|โปเกมอนสการ์เล็ต
Pokémon Violet|โปเกมอนไวโอเล็ต
Pokémon Unite|โปเกมอนยูไนต์
Yu-Gi-Oh! Master Duel|ยูกิโอมาสเตอร์ดูเอล
Cookie Run: Kingdom|คุกกี้รันคิงดอม
Cookie Run: OvenBreak|คุกกี้รันโอเวนเบรก
Clash of Clans|แคลชออฟแคลนส์
Clash Royale|แคลชรอยัล
Brawl Stars|บรอลสตาร์ส
Hay Day|เฮย์เดย์
Subway Surfers|ซับเวย์เซิร์ฟเฟอร์ส
Temple Run 2|เทมเพิลรันสอง
Candy Crush Saga|แคนดี้ครัช
8 Ball Pool|เอทบอลพูล
eFootball|อีฟุตบอล
NBA 2K25|เอ็นบีเอทูเค
Diablo IV|ไดอาโบลสี่
Path of Exile|พาธออฟเอ็กไซล์
Lost Ark|ลอสต์อาร์ก
Tower of Fantasy|ทาวเวอร์ออฟแฟนตาซี
"""),
    "movie_characters": ("Top 100 ตัวละครจากหนังทั่วโลก", """
Iron Man|Tony Stark|ไอรอนแมน
Spider-Man|Peter Parker|สไปเดอร์แมน
Batman|Bruce Wayne|แบทแมน
Joker|โจ๊กเกอร์
Harry Potter|แฮร์รี่ พอตเตอร์
Darth Vader|Anakin Skywalker|ดาร์ธ เวเดอร์
Jack Sparrow|กัปตันแจ็ค สแปร์โรว์
Superman|Clark Kent|ซูเปอร์แมน
Wonder Woman|Diana Prince|วันเดอร์วูแมน
Captain America|Steve Rogers|กัปตันอเมริกา
Thor|ธอร์
Black Panther|T'Challa|แบล็กแพนเธอร์
Hulk|Bruce Banner|ฮัลค์
Doctor Strange|Stephen Strange|ด็อกเตอร์สเตรนจ์
Thanos|ธานอส
Loki|โลกิ
Black Widow|Natasha Romanoff|แบล็กวิโดว์
Deadpool|Wade Wilson|เดดพูล
Wolverine|Logan|วูล์ฟเวอรีน
Professor X|Charles Xavier|ศาสตราจารย์เอ็กซ์
Magneto|Erik Lehnsherr|แม็กนีโต
Green Goblin|Norman Osborn|กรีนก็อบลิน
Venom|Eddie Brock|เวน่อม
Harley Quinn|ฮาร์ลีย์ ควินน์
The Penguin|Oswald Cobblepot|เพนกวิน
Catwoman|Selina Kyle|แคตวูแมน
Aquaman|Arthur Curry|อควาแมน
The Flash|Barry Allen|เดอะแฟลช
Shazam|Billy Batson|ชาแซม
John Wick|จอห์น วิค
James Bond|007|เจมส์ บอนด์
Ethan Hunt|อีธาน ฮันต์
Jason Bourne|เจสัน บอร์น
Indiana Jones|อินเดียนา โจนส์
Lara Croft|ลาร่า ครอฟต์
Katniss Everdeen|แคตนิส เอฟเวอร์ดีน
Hannibal Lecter|ฮันนิบาล เล็กเตอร์
Forrest Gump|ฟอร์เรสต์ กัมป์
Rocky Balboa|ร็อคกี้ บัลบัว
Rambo|John Rambo|แรมโบ้
Terminator T-800|T-800|คนเหล็ก
Sarah Connor|ซาราห์ คอนเนอร์
Ellen Ripley|เอเลน ริปลีย์
Predator|พรีเดเตอร์
Alien Xenomorph|Xenomorph|ซีโนมอร์ฟ
Neo|Thomas Anderson|นีโอ
Morpheus|มอร์เฟียส
Trinity|ทรินิตี้
Agent Smith|เอเจนต์สมิธ
Luke Skywalker|ลุค สกายวอล์คเกอร์
Princess Leia|Leia Organa|เจ้าหญิงเลอา
Han Solo|ฮาน โซโล
Yoda|โยดา
Obi-Wan Kenobi|โอบีวัน เคโนบี
Chewbacca|ชิวแบคคา
R2-D2|อาร์ทูดีทู
C-3PO|ซีทรีพีโอ
Rey|เรย์
Kylo Ren|Ben Solo|ไคโล เรน
The Mandalorian|Din Djarin|แมนดาโลเรียน
Frodo Baggins|โฟรโด แบ๊กกิ้นส์
Gandalf|แกนดัล์ฟ
Aragorn|อารากอร์น
Legolas|เลโกลัส
Gimli|กิมลี
Gollum|Sméagol|กอลลัม
Samwise Gamgee|แซมไวส์
Bilbo Baggins|บิลโบ แบ๊กกิ้นส์
Saruman|ซารูมาน
Sauron|เซารอน
Hermione Granger|เฮอร์ไมโอนี่ เกรนเจอร์
Ron Weasley|รอน วีสลีย์
Albus Dumbledore|อัลบัส ดัมเบิลดอร์
Severus Snape|เซเวอรัส สเนป
Voldemort|Tom Riddle|โวลเดอมอร์
Draco Malfoy|เดรโก มัลฟอย
Hagrid|Rubeus Hagrid|แฮกริด
Newt Scamander|นิวท์ สคามันเดอร์
Jack Dawson|แจ็ค ดอว์สัน
Rose DeWitt Bukater|โรส เดวิตต์ บูคาเตอร์
The Godfather|Vito Corleone|ดอน วีโต
Michael Corleone|ไมเคิล คอร์เลโอเน
Tony Montana|โทนี่ มอนทาน่า
Travis Bickle|ทราวิส บิคเคิล
Tyler Durden|ไทเลอร์ เดอร์เดน
The Bride|Beatrix Kiddo|เดอะไบรด์
Jules Winnfield|จูลส์ วินน์ฟิลด์
Vincent Vega|วินเซนต์ เวกา
Marty McFly|มาร์ตี้ แม็กฟลาย
Doc Brown|Emmett Brown|ด็อก บราวน์
Willy Wonka|วิลลี่ วองก้า
Mary Poppins|แมรี่ ป๊อปปิ้นส์
Barbie|บาร์บี้
Ken|เคน
Oppenheimer|J. Robert Oppenheimer|ออปเพนไฮเมอร์
Maverick|Pete Mitchell|มาเวอริค
Po|Kung Fu Panda|โป
Shrek|เชร็ค
Elsa|เอลซ่า
Anna|แอนนา
"""),
    "global_foods": ("Top 100 อาหารยอดนิยมทั่วโลก", """
Pizza|พิซซ่า
Burger|Hamburger|เบอร์เกอร์
Sushi|ซูชิ
Ramen|ราเมง
Tacos|ทาโก้
Steak|สเต๊ก
Pasta|พาสต้า
Dim Sum|ติ่มซำ
Croissant|ครัวซองต์
Fried Chicken|ไก่ทอด
French Fries|เฟรนช์ฟรายส์
Ice Cream|ไอศกรีม
Chocolate|ช็อกโกแลต
Sandwich|แซนด์วิช
Hot Dog|ฮอตดอก
Kebab|เคบับ
Biryani|ข้าวหมกบริยานี
Butter Chicken|บัตเตอร์ชิกเกน
Curry|แกงกะหรี่
Pad Thai|ผัดไทย
Tom Yum|ต้มยำ
Pho|เฝอ
Banh Mi|บั๋นหมี่
Bibimbap|บิบิมบับ
Kimchi|กิมจิ
Korean Barbecue|ปิ้งย่างเกาหลี
Jajangmyeon|จาจังมยอน
Tteokbokki|ต๊อกบกกี
Udon|อุด้ง
Soba|โซบะ
Tempura|เทมปุระ
Yakitori|ยากิโทริ
Okonomiyaki|โอโคโนมิยากิ
Takoyaki|ทาโกะยากิ
Onigiri|โอนิกิริ
Gyoza|เกี๊ยวซ่า
Peking Duck|เป็ดปักกิ่ง
Kung Pao Chicken|ไก่กงเป่า
Mapo Tofu|มาโปเต้าหู้
Hot Pot|หม้อไฟ
Spring Rolls|ปอเปี๊ยะ
Chow Mein|ผัดหมี่จีน
Fried Rice|ข้าวผัด
Wonton Soup|ซุปเกี๊ยว
Congee|โจ๊ก
Xiao Long Bao|เสี่ยวหลงเปา
Char Siu|หมูแดง
Hainanese Chicken Rice|ข้าวมันไก่ไหหลำ
Satay|สะเต๊ะ
Nasi Goreng|นาซีโกเร็ง
Rendang|เรนดัง
Laksa|ลักซา
Hummus|ฮัมมุส
Falafel|ฟาลาเฟล
Shawarma|ชาวาร์มา
Pita Bread|ขนมปังพิต้า
Paella|ปาเอญ่า
Tapas|ทาปาส
Gazpacho|กัซปาโช
Lasagna|ลาซานญ่า
Risotto|รีซอตโต
Gnocchi|ญ็อกกี
Carbonara|คาโบนาร่า
Tiramisu|ทีรามิสุ
Gelato|เจลาโต
Focaccia|โฟคัชชา
Bruschetta|บรูสเกตต้า
Ravioli|ราวิโอลี
Macaroni and Cheese|มักกะโรนีชีส
Barbecue Ribs|ซี่โครงบาร์บีคิว
Buffalo Wings|บัฟฟาโลวิงส์
Clam Chowder|ซุปหอยลาย
Pancakes|แพนเค้ก
Waffles|วาฟเฟิล
Donuts|โดนัท
Cheesecake|ชีสเค้ก
Apple Pie|พายแอปเปิล
Brownies|บราวนี่
Churros|ชูโรส
Crepes|เครป
Quiche|คีช
Ratatouille|ราตาตูย
Beef Bourguignon|บูร์กินญง
Coq au Vin|ก๊อกโอแวง
Fish and Chips|ฟิชแอนด์ชิปส์
Shepherd's Pie|เชพเพิร์ดพาย
Sunday Roast|ซันเดย์โรสต์
Schnitzel|ชนิทเซล
Bratwurst|บราทเวิร์สต์
Pretzel|เพรตเซล
Goulash|กูลาช
Pierogi|เปียโรกี
Borscht|บอร์ชต์
Moussaka|มูซากา
Gyros|ไจโร
Souvlaki|ซูฟลากี
Ceviche|เซวิเช
Empanadas|เอมปานาดา
Arepas|อาเรปัส
Poutine|ปูตีน
"""),
    "thai_travel": ("Top 100 สถานที่ท่องเที่ยวในไทย", """
วัดพระแก้ว|Temple of the Emerald Buddha
ดอยอินทนนท์|Doi Inthanon
เกาะพีพี|Phi Phi Islands
ประตูท่าแพ|Tha Phae Gate
วัดร่องขุ่น|White Temple
ภูทับเบิก|Phu Thap Boek
อุทยานประวัติศาสตร์พระนครศรีอยุธยา|Ayutthaya Historical Park|อยุธยา
วัดอรุณราชวราราม|Wat Arun|วัดอรุณ
พระบรมมหาราชวัง|Grand Palace
วัดโพธิ์|Wat Pho
ตลาดน้ำดำเนินสะดวก|Damnoen Saduak Floating Market
ตลาดน้ำอัมพวา|Amphawa Floating Market
คลองบางหลวง|Khlong Bang Luang
ถนนข้าวสาร|Khao San Road
เยาวราช|Yaowarat
ไอคอนสยาม|ICONSIAM
เอเชียทีค เดอะ ริเวอร์ฟร้อนท์|Asiatique
สวนลุมพินี|Lumphini Park
ภูเขาทอง|Golden Mount
วัดไตรมิตร|Wat Traimit
วัดเบญจมบพิตร|Marble Temple
พิพิธภัณฑสถานแห่งชาติ พระนคร|Bangkok National Museum
บ้านจิม ทอมป์สัน|Jim Thompson House
สนามหลวง|Sanam Luang
บางปู|Bang Pu Recreation Center
พระปฐมเจดีย์|Phra Pathom Chedi
ตลาดร่มหุบ|Maeklong Railway Market
พระราชวังบางปะอิน|Bang Pa-In Palace
วัดมหาธาตุ อยุธยา|Wat Mahathat Ayutthaya
วัดไชยวัฒนาราม|Wat Chaiwatthanaram
อุทยานประวัติศาสตร์สุโขทัย|Sukhothai Historical Park
วัดศรีชุม|Wat Si Chum
อุทยานประวัติศาสตร์ศรีสัชนาลัย|Si Satchanalai Historical Park
วัดพระธาตุดอยสุเทพ|Doi Suthep Temple
ดอยสุเทพ-ปุย|Doi Suthep-Pui National Park
ม่อนแจ่ม|Mon Jam
แม่กำปอง|Mae Kampong
ดอยหลวงเชียงดาว|Doi Luang Chiang Dao
เชียงดาว|Chiang Dao
น้ำพุร้อนสันกำแพง|San Kamphaeng Hot Springs
เชียงคาน|Chiang Khan
ภูเรือ|Phu Ruea
ภูกระดึง|Phu Kradueng
ภูชี้ฟ้า|Phu Chi Fa
ดอยผาตั้ง|Doi Pha Tang
สามเหลี่ยมทองคำ|Golden Triangle Thailand
วัดพระธาตุผาซ่อนแก้ว|Wat Pha Sorn Kaew
เขาค้อ|Khao Kho
อุทยานแห่งชาติภูหินร่องกล้า|Phu Hin Rong Kla
อุทยานแห่งชาติน้ำหนาว|Nam Nao National Park
ปาย|Pai Thailand
สะพานประวัติศาสตร์ปาย|Pai Memorial Bridge
ปางอุ๋ง|Pang Ung
บ้านรักไทย|Ban Rak Thai
ทุ่งบัวตองดอยแม่อูคอ|Doi Mae U Kho Sunflower Fields
ถ้ำหลวงขุนน้ำนางนอน|Tham Luang Cave
วัดห้วยปลากั้ง|Wat Huay Pla Kang
บ้านดำ เชียงราย|Baan Dam Museum
สิงห์ปาร์ค เชียงราย|Singha Park Chiang Rai
อุทยานแห่งชาติแม่วงก์|Mae Wong National Park
น้ำตกเอราวัณ|Erawan Falls
สะพานข้ามแม่น้ำแคว|Bridge on the River Kwai
ทางรถไฟสายมรณะ|Death Railway
เมืองมัลลิกา ร.ศ. 124|Mallika R.E. 124
เขื่อนศรีนครินทร์|Srinakarin Dam
อุทยานแห่งชาติเขาใหญ่|Khao Yai National Park
ปาลิโอ เขาใหญ่|Palio Khao Yai
อุทยานแห่งชาติหาดเจ้าไหม|Hat Chao Mai National Park
วังน้ำเขียว|Wang Nam Khiao
หาดบางแสน|Bang Saen Beach
เกาะล้าน|Koh Larn
ปราสาทสัจธรรม|Sanctuary of Truth
สวนนงนุช|Nong Nooch Tropical Garden
เกาะเสม็ด|Koh Samet
เกาะช้าง|Koh Chang
น้ำตกพลิ้ว|Namtok Phlio
อุทยานประวัติศาสตร์พนมรุ้ง|Phanom Rung Historical Park
ปราสาทหินพิมาย|Phimai Historical Park
สามพันโบก|Sam Phan Bok
ผาแต้ม|Pha Taem
ทะเลบัวแดง|Red Lotus Sea
ภูพระบาท|Phu Phra Bat
อุทยานแห่งชาติแก่งกระจาน|Kaeng Krachan National Park
ตลาดฉัตรไชย|Chatchai Market
หัวหิน|Hua Hin
ถ้ำพระยานคร|Phraya Nakhon Cave
อุทยานแห่งชาติเขาสามร้อยยอด|Khao Sam Roi Yot National Park
เกาะเต่า|Koh Tao
เกาะสมุย|Koh Samui
เกาะพะงัน|Koh Phangan
อุทยานแห่งชาติหมู่เกาะอ่างทอง|Ang Thong Marine Park
หาดไร่เลย์|Railay Beach
เกาะลันตา|Koh Lanta
สระมรกต กระบี่|Emerald Pool Krabi
อ่าวพังงา|Phang Nga Bay
เกาะตะปู|James Bond Island
หาดป่าตอง|Patong Beach
แหลมพรหมเทพ|Promthep Cape
หมู่เกาะสิมิลัน|Similan Islands
หมู่เกาะสุรินทร์|Surin Islands
"""),
    "world_travel": ("Top 100 สถานที่ท่องเที่ยวทั่วโลก", """
หอไอเฟล|Eiffel Tower
กำแพงเมืองจีน|Great Wall of China
พีระมิดกิซา|Pyramids of Giza
เทพีเสรีภาพ|Statue of Liberty
โคลอสเซียม|Colosseum
ภูเขาไฟฟูจิ|Mount Fuji|ฟูจิ
ทัชมาฮาล|Taj Mahal
มาชูปิกชู|Machu Picchu
นครวัด|Angkor Wat
หอนาฬิกาบิ๊กเบน|Big Ben
พระราชวังบักกิงแฮม|Buckingham Palace
ลอนดอนอาย|London Eye
สะพานทาวเวอร์บริดจ์|Tower Bridge
สโตนเฮนจ์|Stonehenge
พิพิธภัณฑ์ลูฟวร์|Louvre Museum
ประตูชัยฝรั่งเศส|Arc de Triomphe
พระราชวังแวร์ซาย|Palace of Versailles
มหาวิหารนอเทรอดาม|Notre-Dame Cathedral
มงแซ็งมีแชล|Mont Saint-Michel
โบสถ์ซากราดาฟามีเลีย|Sagrada Familia
สวนกูเอล|Park Güell
พระราชวังอาลัมบรา|Alhambra
พิพิธภัณฑ์ปราโด|Prado Museum
น้ำพุเทรวี|Trevi Fountain
นครวาติกัน|Vatican City
มหาวิหารเซนต์ปีเตอร์|St. Peter's Basilica
วิหารแพนธีออน|Pantheon Rome
หอเอนเมืองปิซา|Leaning Tower of Pisa
คลองเวนิส|Venice Grand Canal
จัตุรัสเซนต์มาร์ก|St. Mark's Square
มหาวิหารดูโอโม ฟลอเรนซ์|Florence Cathedral
ชายฝั่งอามาลฟี|Amalfi Coast
ซานโตรินี|Santorini
อะโครโพลิส|Acropolis of Athens
เกาะมิโคนอส|Mykonos
นครโบราณปอมเปอี|Pompeii
ปราสาทนอยชวานชไตน์|Neuschwanstein Castle
ประตูบรันเดินบวร์ค|Brandenburg Gate
มหาวิหารโคโลญ|Cologne Cathedral
เทือกเขาแอลป์|Alps
ยอดเขาแมตเทอร์ฮอร์น|Matterhorn
เมืองฮัลล์ชตัทท์|Hallstatt
พระราชวังเชินบรุนน์|Schönbrunn Palace
สะพานชาร์ลส์|Charles Bridge
จัตุรัสเมืองเก่าปราก|Old Town Square Prague
คลองอัมสเตอร์ดัม|Amsterdam Canals
สวนเคอเคนฮอฟ|Keukenhof
โบสถ์ฮัลล์กรีมสคิร์กยา|Hallgrímskirkja
บลูลากูน ไอซ์แลนด์|Blue Lagoon Iceland
น้ำตกกุลล์ฟอสส์|Gullfoss
แสงเหนือเมืองทรอมโซ|Tromsø Northern Lights
ฟยอร์ดไกแรงเกอร์|Geirangerfjord
ราชวังฤดูหนาว|Winter Palace
จัตุรัสแดง|Red Square Moscow
มหาวิหารเซนต์เบซิล|Saint Basil's Cathedral
พระราชวังโทพคาปึ|Topkapi Palace
ฮาเกียโซเฟีย|Hagia Sophia
คัปปาโดเกีย|Cappadocia
ปามุคคาเล|Pamukkale
เพตรา|Petra Jordan
ทะเลเดดซี|Dead Sea
เบิร์จคาลิฟา|Burj Khalifa
พิพิธภัณฑ์แห่งอนาคต ดูไบ|Museum of the Future Dubai
มัสยิดชีคซาเยด|Sheikh Zayed Grand Mosque
ป้อมอัครา|Agra Fort
ชัยปุระ|Jaipur
พระราชวังไมซอร์|Mysore Palace
วิหารทองคำอมฤตสาร์|Golden Temple Amritsar
เอเวอเรสต์เบสแคมป์|Everest Base Camp
วัดสเวยัมภูนาถ|Swayambhunath
พระราชวังโปตาลา|Potala Palace
พระราชวังต้องห้าม|Forbidden City
จัตุรัสเทียนอันเหมิน|Tiananmen Square
ทหารดินเผา|Terracotta Army
หาดไว่ทัน|The Bund Shanghai
ดิสนีย์แลนด์ฮ่องกง|Hong Kong Disneyland
เมอร์ไลออน|Merlion
มารีนาเบย์แซนด์ส|Marina Bay Sands
การ์เดนส์บายเดอะเบย์|Gardens by the Bay
ตึกแฝดเปโตรนาส|Petronas Towers
วัดโบรโบดูร์|Borobudur
ภูเขาไฟโบรโม|Mount Bromo
อ่าวฮาลอง|Ha Long Bay
ฮอยอัน|Hoi An
พระราชวังเคียงบกกุง|Gyeongbokgung Palace
เกาะเชจู|Jeju Island
หอคอยโตเกียว|Tokyo Tower
โตเกียวสกายทรี|Tokyo Skytree
ศาลเจ้าฟูชิมิอินาริ|Fushimi Inari Shrine
วัดคิโยมิซุ|Kiyomizu-dera
ปราสาทโอซาก้า|Osaka Castle
ยูนิเวอร์แซลสตูดิโอญี่ปุ่น|Universal Studios Japan
แกรนด์แคนยอน|Grand Canyon
น้ำตกไนแอการา|Niagara Falls
ไทม์สแควร์|Times Square
สะพานโกลเดนเกต|Golden Gate Bridge
ดิสนีย์แลนด์แคลิฟอร์เนีย|Disneyland California
รูปปั้นพระเยซูคริสต์|Christ the Redeemer
น้ำตกอีกวาซู|Iguazu Falls
โรงอุปรากรซิดนีย์|Sydney Opera House
"""),
    "global_brands": ("Top 100 แบรนด์ดังทั่วโลก", """
Apple|แอปเปิล
Google|กูเกิล
Nike|ไนกี้
Coca-Cola|โคคาโคล่า|โค้ก
Samsung|ซัมซุง
Toyota|โตโยต้า
Louis Vuitton|หลุยส์ วิตตอง
Microsoft|ไมโครซอฟท์
Amazon|แอมะซอน
McDonald's|แมคโดนัลด์
Disney|ดิสนีย์
Adidas|อาดิดาส
Starbucks|สตาร์บัคส์
Netflix|เน็ตฟลิกซ์
Meta|เมตา
Tesla|เทสลา
BMW|บีเอ็มดับเบิลยู
Mercedes-Benz|เมอร์เซเดส-เบนซ์
Honda|ฮอนด้า
Sony|โซนี่
Intel|อินเทล
Nvidia|เอ็นวิเดีย
IBM|ไอบีเอ็ม
Visa|วีซ่า
Mastercard|มาสเตอร์การ์ด
PayPal|เพย์พาล
YouTube|ยูทูบ
TikTok|ติ๊กต็อก
Instagram|อินสตาแกรม
Facebook|เฟซบุ๊ก
WhatsApp|วอตส์แอป
Uber|อูเบอร์
Airbnb|แอร์บีเอ็นบี
Spotify|สปอติฟาย
Lego|เลโก้
Nintendo|นินเทนโด
PlayStation|เพลย์สเตชัน
Xbox|เอกซ์บอกซ์
Gucci|กุชชี่
Chanel|ชาแนล
Hermès|แอร์เมส
Prada|พราด้า
Dior|ดิออร์
Burberry|เบอร์เบอรี่
Rolex|โรเล็กซ์
Cartier|คาร์เทียร์
Tiffany & Co.|ทิฟฟานี่
Zara|ซาร่า
H&M|เอชแอนด์เอ็ม
Uniqlo|ยูนิโคล่
IKEA|อิเกีย
Walmart|วอลมาร์ต
Costco|คอสต์โก
Target|ทาร์เก็ต
KFC|เคเอฟซี
Burger King|เบอร์เกอร์คิง
Subway|ซับเวย์
Pizza Hut|พิซซ่าฮัท
Domino's|โดมิโน่พิซซ่า
Pepsi|เป๊ปซี่
Red Bull|เรดบูล
Nestlé|เนสท์เล่
Nescafé|เนสกาแฟ
KitKat|คิทแคท
Oreo|โอรีโอ
Lay's|เลย์
Pringles|พริงเกิลส์
Heineken|ไฮเนเก้น
Budweiser|บัดไวเซอร์
Porsche|ปอร์เช่
Ferrari|เฟอร์รารี่
Lamborghini|ลัมโบร์กินี
Audi|อาวดี้
Volkswagen|โฟล์คสวาเกน
Ford|ฟอร์ด
Chevrolet|เชฟโรเลต
Hyundai|ฮุนได
Kia|เกีย
Nissan|นิสสัน
Mazda|มาสด้า
Lexus|เลกซัส
Volvo|วอลโว่
Boeing|โบอิ้ง
Emirates|เอมิเรตส์
Singapore Airlines|สิงคโปร์แอร์ไลน์
Qatar Airways|กาตาร์แอร์เวย์
FedEx|เฟดเอ็กซ์
DHL|ดีเอชแอล
UPS|ยูพีเอส
Canon|แคนนอน
Nikon|นิคอน
Panasonic|พานาโซนิค
LG|แอลจี
Xiaomi|เสียวหมี่
Huawei|หัวเว่ย
Oppo|ออปโป้
Vivo|วีโว่
Dell|เดลล์
HP|เอชพี
Lenovo|เลอโนโว
"""),
    "popular_apps": ("Top 100 แอปพลิเคชันยอดนิยม", """
YouTube|ยูทูบ
TikTok|ติ๊กต็อก
Facebook|เฟซบุ๊ก
LINE|ไลน์
Instagram|อินสตาแกรม
Google Maps|กูเกิลแมปส์
Spotify|สปอติฟาย
Netflix|เน็ตฟลิกซ์
WhatsApp|วอตส์แอป
Messenger|เฟซบุ๊กเมสเซนเจอร์
Telegram|เทเลแกรม
X|Twitter|ทวิตเตอร์
Threads|เธรดส์
Reddit|เรดดิต
Discord|ดิสคอร์ด
Snapchat|สแนปแชต
Pinterest|พินเทอเรสต์
LinkedIn|ลิงก์อิน
Twitch|ทวิช
WeChat|วีแชต
Viber|ไวเบอร์
Signal|ซิกนัล
Zoom|ซูม
Google Meet|กูเกิลมีต
Microsoft Teams|ไมโครซอฟท์ทีมส์
Gmail|จีเมล
Outlook|เอาต์ลุก
Google Drive|กูเกิลไดรฟ์
Dropbox|ดรอปบ็อกซ์
OneDrive|วันไดรฟ์
Google Photos|กูเกิลโฟโต้
iCloud|ไอคลาวด์
Google Calendar|กูเกิลคาเลนดาร์
Notion|โนชัน
Evernote|เอเวอร์โน้ต
Trello|เทรลโล
Asana|อาสนะ
Slack|สแลก
Canva|แคนวา
CapCut|แคปคัต
Adobe Photoshop Express|โฟโต้ชอปเอ็กซ์เพรส
Lightroom|ไลต์รูม
VSCO|วีเอสซีโอ
Picsart|พิคส์อาร์ต
Snapseed|สแนปซีด
InShot|อินช็อต
KineMaster|ไคน์มาสเตอร์
ChatGPT|แชตจีพีที
Google Gemini|เจมิไน
Microsoft Copilot|โคไพลอต
Perplexity|เพอร์เพล็กซิตี
Duolingo|ดูโอลิงโก
Kahoot!|คาฮูต
Coursera|คอร์สเซรา
Udemy|ยูเดมี
Kindle|คินเดิล
Audible|ออดิเบิล
Apple Music|แอปเปิลมิวสิก
SoundCloud|ซาวด์คลาวด์
Shazam|ชาแซม
Disney+|ดิสนีย์พลัส
Prime Video|ไพรม์วิดีโอ
HBO Max|เอชบีโอแม็กซ์
Viu|วิว
iQIYI|อ้ายฉีอี้
WeTV|วีทีวี
YouTube Music|ยูทูบมิวสิก
Google Chrome|กูเกิลโครม
Firefox|ไฟร์ฟ็อกซ์
Safari|ซาฟารี
Opera|โอเปรา
Waze|เวซ
Grab|แกร็บ
Uber|อูเบอร์
Bolt|โบลต์
Foodpanda|ฟู้ดแพนด้า
Lalamove|ลาลามูฟ
Shopee|ช้อปปี้
Lazada|ลาซาด้า
Amazon Shopping|แอมะซอนช้อปปิ้ง
eBay|อีเบย์
Etsy|เอ็ตซี
Temu|เทมู
SHEIN|ชีอิน
AliExpress|อาลีเอ็กซ์เพรส
Airbnb|แอร์บีเอ็นบี
Booking.com|บุ๊กกิ้งดอตคอม
Agoda|อโกด้า
Trip.com|ทริปดอตคอม
Skyscanner|สกายสแกนเนอร์
Google Translate|กูเกิลแปลภาษา
Google Earth|กูเกิลเอิร์ธ
PayPal|เพย์พาล
TrueMoney Wallet|ทรูมันนี่วอลเล็ท
K PLUS|กสิกรไทยเคพลัส
SCB EASY|ไทยพาณิชย์อีซี่
Krungthai NEXT|กรุงไทยเน็กซ์
Binance|ไบแนนซ์
Robinhood|โรบินฮูด
Strava|สตราวา
"""),
}


def build_topic(topic_id: str, title: str, raw: str) -> dict[str, object]:
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if len(lines) != 100:
        raise ValueError(f"{topic_id}: expected 100 items, got {len(lines)}")
    items: list[dict[str, object]] = []
    for rank, line in enumerate(lines, 1):
        name, *aliases = (part.strip() for part in line.split("|"))
        if not name or not aliases or any(not alias for alias in aliases):
            raise ValueError(f"{topic_id} rank {rank}: name and alias required")
        items.append({"rank": rank, "name": name, "aliases": aliases})
    return {"id": topic_id, "title": title, "items": items}


def main() -> None:
    existing = {topic["id"]: topic for topic in json.loads(STARTER.read_text(encoding="utf-8"))}
    topics = [existing["thai_food"], build_topic("thai_movies", *RAW_TOPICS["thai_movies"]),
              build_topic("thai_games", *RAW_TOPICS["thai_games"]), existing["anime_characters"]]
    topics += [build_topic(topic_id, *value) for topic_id, value in RAW_TOPICS.items()
               if topic_id not in {"thai_movies", "thai_games"}]
    sys.path.insert(0, str(BANK.parents[4]))
    from app.engine.games.top100 import Top100Topic  # noqa: PLC0415
    from pydantic import TypeAdapter  # noqa: PLC0415
    TypeAdapter(tuple[Top100Topic, ...]).validate_json(json.dumps(topics, ensure_ascii=False))
    BANK.write_text(json.dumps(topics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(topics)} topics and {sum(len(topic['items']) for topic in topics)} items to {BANK}")


if __name__ == "__main__":
    main()
