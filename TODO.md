# Proiektua: Smart Barbell Tracker

## 1. FASEA: Konputazio Bisualaren Muina (Python)

### 1.1 FASEA: Barraren jarraipena (Barbell Tracker)
* [ ] Barra Detektatzeko Algoritmoa: Inplementatu OpenCV detekzioa (kolore edo forma) edo YOLO/MediaPipe.
* [ ] Koordenatuen Jarraipena: Lortu barra-aren (x, y) koordenatuak fotogramaz fotograma.
* [ ] Kalibrazioa eta Eskuadra-neurketa: Bihurtu pixelak mundu errealeko unitateetara (mm/cm), erreferentzia-objektu bat erabiliz (adibidez, diskoaren diametroa).
* [ ] Metrika Zinematikoen Kalkulua:
    * [ ] Desplazamendua (bertikala eta horizontala).
    * [ ] Abiadura eta azelerazio kurba.
    * [ ] Abiadura eta azelerazioa kalkulatu: Errepikapen bakoitza isolatu + Errepikapen guztien media lortu.
* [ ] Emaitzen Bistaratzeko Proba (Plotting): Sortu ibilbidearen eta abiaduraren lehen grafikoak.
    * [ ] Aukera eskaini bi serie desberdinen artean alderatzeko (adibidez, 1. seriea vs azkena).
    * [ ] Konparazio-arazoak aztertu: Bideoak posizio desberdinetatik grabatuta badaude, kalibrazioa nola eragiten duen ebaluatu.

### 1.2 FASEA: Erabiltzailearen formaren jarraipena (Pose Analysis)
* [ ] MediaPipe vs openPose konparatu -> TFG dokumentuan idatzi emaitzak
* [ ] Pose Estimazioa: aurreko atalean hautatutako modeloa inplementatu 
* [ ] Ariketaren Detekzioa/Zehaztapena:
    * [ ] **Hasierakoa:** Erabiltzaileak eskuz zehaztu beharko du egiten ari den ariketa (Sentadilla, Banca, Deadlift, etab.).
    * [ ] **Aurreratua (Hobekuntza):** Pose-datuetan oinarritutako sailkatzaile bat entrenatu ariketa automatikoki detektatzeko.
* [ ] Posturaren Zuzenketa (Formaren Analisia):
    * [ ] Puntu garrantzitsuen arteko **angeluak** kalkulatu (adibidez, enborraren eta femurraren arteko angelua, belaunaren flexio-angelua).
    * [ ] Angelsuak aurrez definitutako mugen aurka konparatu (adibidez, 'squat' sakontasuna edo 'deadlift' bizkarrezurraren angelua).
    * [ ] Feedback bisuala sortu (adibidez, alerta bat "belaunak barrurantz" edo "bizkarra gehiegi okertuta" dagoenean).

---

## 2. FASEA: Aplikazioaren Garapena eta Integrazioa (Web/Backend)

* [ ] Datu-basearen Diseinua (Zehatza):
    * [ ] Erabiltzailearen ezaugarriak (Metrics, PRs, Ezaugarri fisikoak).
    * [ ] Entrenamenduaren ezaugarriak (Data, Ariketa Zerrenda, Pisuak, Errepikapenak, Serieak).
    * [ ] **Bideo-metadata** eta Analisi Emaitzak (Barraren Ibilbidea, Abiadura, etab.) Entrenamendu/Serie bakoitzarekin lotuta.
* [ ] Backend APIaren Ezarpena: Typescript vs Python
    * [ ] Endpointak definitu aukeratutako hizkuntzan
        * [ ] Erabiltzailearen autentifikazioa (Izena eman, Sartu, Token kudeaketa).
        * [ ] Entrenamendua (Sortu, Lortu, Eguneratu, Ezabatu).
        * [ ] Bideoa **(Gorde (Kargatu)** $\rightarrow$ **S3/Google Cloud) / Bideorako esteka lortu.**
        * [ ] Bideoa aztertu (Endpoint bat sortu, Konputazio Bisualeko modulua deituko duena).
* [ ] Bideoen Biltegiratzea: Konfiguratu biltegiratze zerbitzua (AWS S3/Google Cloud Storage) bideo gordinetarako.
* [ ] Atzeko Planoko Lanen Ilara (**Celery/Redis**): Konfiguratu bideoen analisia asinkronoki egiteko.
* [ ] Frontend Oinarria (React): Sortu oinarrizko interfazea (Login, Bideoa Kargatzeko gunea). $\rightarrow$ Proba egiteko gutxieneko funtzionaltasunak.
* [ ] **1. Demoa** 
    * [ ] Erabiltzaile gutxi batzuei bideoak kargatu eta analisiaren lehen feedback-a jasotzeko aukera eman.

---

##  3. FASEA: Bistaratzeko eta Kudeatzeko Sistemak

* [ ] Analisiaren Ikuspegi Zehatza: Erakutsi:
    * [ ] Barra-aren ibilbidearen grafiko interaktiboa (XY), errepikapen bakoitza nabarmenduz.
    * [ ] Abiadura/Azelerazio grafikoak denboran zehar (tarteak mozteko aukerarekin).
    * [ ] Formaren Analisiaren Feedbacka bistaratu (1.2 FASEA).
* [ ] Entrenamenduak Gordetzeko Interfazea: Erabiltzaileei datuak (Pisua, Errep., Serieak, Oharrak) eskuz sartzeko aukera eman.
* [ ] Uneko Entrenamendua Interfazea (Plangintza eta Grabaketa):
    * [ ] **1. Aukera (Planifikatua):** Entrenamendua aurrez kargatu (ariketak, serieak, errepikapenak).
        * [ ] Entrenamendua "Martxan jarri" $\rightarrow$ Uneko ariketa pantailan erakutsi.
        * [ ] Atalekoa: Atsedena neurtzeko tenporizadorea.
    * [ ] **2. Aukera (Momentukoa):** Informazioa momentuan gorde (Seriea amaitzean).
    * [ ] Ariketa batean pisua, errepikapenak edo seriak aldatzeko aukera eman, jatorrizko planaren aurka.
* [ ] Entrenamenduaren Inguruko Informazioaren Kalkulua eta Aurkeztea:
    * [ ] Sobrecarga Progresiboaren Jarraipena (Astetik Astera, bolumenaren eta intentsitatearen metrika).
    * [ ] PRak gordetzeko atala (1 Rep Max, 5 Rep Max, etab.).
* [ ] **2. Demoa** publikatu interneten (Funtzionalitate osoa).
    * [ ] Erabiltzaileen feedbacka jaso usagarritasunari eta funtzionalitateari buruz.

---

## 4. FASEA: Hobekuntzak eta Mantentze-lanak
* [ ] Jasotako feedbacketik hobekuntzak egin (GUI/UX, Metrika berriak).
* [ ] Segurtasun Proba Integralak eta Errendimenduaren Optimizazioa (Bideoen prozesamendu denbora murriztea).