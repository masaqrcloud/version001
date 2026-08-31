# MasaQR yerel yedek ve geri yükleme

`masaqr-backup.timer` her gün 03:30'da SQLite veritabanının tutarlı
snapshot'ını ve `public/uploads` arşivini `/home/ubuntu/masaqr-backups`
altına yazar. Son 7 yedek tutulur.

Durumu kontrol et:

```bash
systemctl status masaqr-backup.timer
journalctl -u masaqr-backup.service --since today
ls -lah /home/ubuntu/masaqr-backups
```

Manuel yedek:

```bash
sudo systemctl start masaqr-backup.service
```

Geri yükleme:

```bash
sudo systemctl stop nextapp
cp /home/ubuntu/masaqr/prisma/dev.db /home/ubuntu/masaqr/prisma/dev.db.before-restore
cp /home/ubuntu/masaqr-backups/TARIH/database.db /home/ubuntu/masaqr/prisma/dev.db
tar -C /home/ubuntu/masaqr/public -xzf /home/ubuntu/masaqr-backups/TARIH/uploads.tar.gz
sudo systemctl start nextapp
```

Bu yedek aynı EC2/EBS diski üzerindedir. Yanlış veri değişikliğine karşı
geri dönüş sağlar fakat instance veya disk tamamen kaybolursa yedek de
kaybolur. Pilot sonrasında hedef S3 veya ayrı bir yedek disk olmalıdır.
