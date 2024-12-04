import csv

# Kirish va chiqish fayllarini ochish
with open('dbip-country-ipv4.csv', 'r') as input_file, open('JP-ipv4.csv', 'w', newline='') as output_file:
    # CSV oʻqish va yozish obʼektlarini yaratish
    reader = csv.reader(input_file)
    writer = csv.writer(output_file)

    # Kirish faylini satrma-satr o'qing, hukm qiling va chiqadigan faylga yozing
    for row in reader:
        if row[-1][-2:] == 'JP':
            writer.writerow(row)
