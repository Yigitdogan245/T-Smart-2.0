# TSmart Projesi - Geliştirme Notları (ahmet-TSmart Dalı)

Bu dalda (branch), TSmart projesinin planlama, veritabanı sistem tasarımı, veritabanı mimarisi ve kodlamaları üzerine tarafımca (Ahmet Eren Yakut) gerçekleştirilen çalışmalar yer almaktadır. 

## 📌 Üstlenilen Görevler ve Yapılan Çalışmalar

Proje kapsamında sistemin temel mimarisi kurulmuş ve aşağıdaki görevler başarıyla tamamlanmıştır:

### 1. Proje Yönetimi ve Planlama
* **Gantt Chart:** Projenin başlangıcından teslimine kadar olan tüm süreçler (Gereksinim Analizi, DB Tasarımı, Kodlama, Test) takvimlendirildi ve görev paylaşımları görselleştirildi.
* **CPM Diyagramı (Kritik Yol Analizi):** Proje görevleri arasındaki bağımlılıklar hesaplandı. Toplam proje süresi 32 gün olarak belirlenerek, projenin tamamlanmasını doğrudan etkileyecek kritik yol (A → B → C → D → F → G → H) tespit edildi.

### 2. Sistem Tasarımı
* **UML Sınıf Diyagramı:** Sistemin nesne yönelimli mimarisi çizildi. `Kullanici` üst sınıfından türeyen `Admin`, `Antrenor` ve `Sporcu` sınıflarının metotları ve birbirleriyle olan ilişkileri (Kuşak, Video, Maç ve Hata sınıfları ile) modellendi.
* **ER Diyagramı:** Veritabanı varlık-ilişki modeli oluşturuldu. Birincil (Primary Key) ve İkincil (Foreign Key) anahtarlar belirlenerek tablolar arası bağlar kuruldu.

### 3. Veritabanı Tasarımı ve Geliştirme
* Sistemin arka planında çalışacak ilişkisel veritabanı mimarisi (MySQL) baştan sona tasarlandı ve kodlandı.
* Geliştirilen ana tablolar: `kullanicilar`, `sporcular`, `maclar`, `hatalar`, `kusaklar`, ve `videolar`.
* Tablolar arası 1-N ilişkiler kurularak veri bütünlüğü sağlandı (Örn: Bir sporcunun birden fazla maçı ve hatası olabilmesi, antrenörlerin bu maçları ve hataları takip edebilmesi mantığı veritabanı seviyesinde çözüldü).

### 4. Dokümantasyon
* Tüm diyagramların, tabloların ve planlama araçlarının dokümantasyonları hazırlanarak proje klasörüne entegre edildi.

---
**Geliştirici:** Ahmet Eren Yakut
**Kapsam:** Proje Planlama, Veritabanı Mimarisi, UML/ER Tasarımı ve Arka Plan Geliştirmeleri



<img width="1085" height="920" alt="WhatsApp Image 2026-04-29 at 23 12 30" src="https://github.com/user-attachments/assets/60feef5c-aeb4-445a-8726-e7e99baf8dbf" />
<img width="223" height="821" alt="WhatsApp Image 2026-04-29 at 13 10 11" src="https://github.com/user-attachments/assets/d9bda836-ebf5-45b2-b0f8-c4bddc4fc139" />
<img width="1024" height="648" alt="WhatsApp Image 2026-04-29 at 13 09 31" src="https://github.com/user-attachments/assets/9bbb001c-fd2a-4d86-8273-eba6846a8849" />
<img width="661" height="539" alt="WhatsApp Image 2026-04-29 at 13 09 22" src="https://github.com/user-attachments/assets/d3ec79fd-e56a-4431-8a65-5eb31aed10e3" />
<img width="1600" height="550" alt="WhatsApp Image 2026-03-28 at 20 44 46" src="https://github.com/user-attachments/assets/41b27c20-aa61-4230-b2f3-dd992cf33b34" />
<img width="1600" height="604" alt="WhatsApp Image 2026-03-28 at 20 43 16" src="https://github.com/user-attachments/assets/f42aa6f5-1bc7-44fb-89b6-af1825d04256" />
<img width="1414" height="438" alt="WhatsApp Image 2026-03-28 at 20 42 19" src="https://github.com/user-attachments/assets/7092715e-f5fb-46cd-adc6-8194f09fc4b5" />
<img width="650" height="601" alt="WhatsApp Image 2026-03-28 at 19 51 22" src="https://github.com/user-attachments/assets/ba281a98-1f8c-4427-9836-74db42db2162" />
<img width="1600" height="657" alt="WhatsApp Image 2026-05-10 at 20 50 35" src="https://github.com/user-attachments/assets/03e1a786-b7df-458f-8d2f-4e4ad50d4eb5" />
