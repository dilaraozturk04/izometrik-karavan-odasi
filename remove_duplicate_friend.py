import os

path_html = 'C:/Users/Lenovo/.gemini/antigravity/scratch/izometrik-oda/index.html'
with open(path_html, 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

old_carousel = """        <div class="carousel-container" id="carousel-friends">
          <button class="carousel-btn prev-btn" onclick="prevSlide('carousel-friends')">&#10094;</button>
          <div class="carousel-slides">
            <div class="carousel-slide active">
              <img src="friend_1.jpg" alt="Kalp Yapan Arkadaşlar" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_2.jpg" alt="Kemer Önünde Arkadaşlar" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_3.jpg" alt="Grup Selfie Parkta" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_4.jpg" alt="3 Arkadaş Parkta" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_5.jpg" alt="3 Arkadaş Odada" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_7.jpg" alt="Çalışma Odasında Üç Arkadaş" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_6.jpg" alt="Kafe Masasında Arkadaşlar" class="carousel-img">
            </div>
          </div>
          <button class="carousel-btn next-btn" onclick="nextSlide('carousel-friends')">&#10095;</button>
          <div class="carousel-dots">
            <span class="dot active" onclick="setSlide('carousel-friends', 0)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 1)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 2)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 3)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 4)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 5)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 6)"></span>
          </div>
        </div>"""

new_carousel = """        <div class="carousel-container" id="carousel-friends">
          <button class="carousel-btn prev-btn" onclick="prevSlide('carousel-friends')">&#10094;</button>
          <div class="carousel-slides">
            <div class="carousel-slide active">
              <img src="friend_1.jpg" alt="Kalp Yapan Arkadaşlar" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_2.jpg" alt="Kemer Önünde Arkadaşlar" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_3.jpg" alt="Grup Selfie Parkta" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_4.jpg" alt="3 Arkadaş Parkta" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_5.jpg" alt="3 Arkadaş Odada" class="carousel-img">
            </div>
            <div class="carousel-slide">
              <img src="friend_6.jpg" alt="Kafe Masasında Arkadaşlar" class="carousel-img">
            </div>
          </div>
          <button class="carousel-btn next-btn" onclick="nextSlide('carousel-friends')">&#10095;</button>
          <div class="carousel-dots">
            <span class="dot active" onclick="setSlide('carousel-friends', 0)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 1)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 2)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 3)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 4)"></span>
            <span class="dot" onclick="setSlide('carousel-friends', 5)"></span>
          </div>
        </div>"""

if old_carousel in content:
    content = content.replace(old_carousel, new_carousel)
    print("Successfully removed duplicate slide from index.html!")
else:
    print("Failed to replace carousel block in HTML")

with open(path_html, 'w', encoding='utf-8') as f:
    f.write(content)

# Delete the duplicate image file
file_to_delete = 'C:/Users/Lenovo/.gemini/antigravity/scratch/izometrik-oda/friend_7.jpg'
if os.path.exists(file_to_delete):
    os.remove(file_to_delete)
    print("Deleted duplicate image file friend_7.jpg successfully!")
else:
    print("Duplicate image file friend_7.jpg not found or already deleted")
