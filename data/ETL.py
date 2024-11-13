# -*- coding: utf-8 -*-
"""
Created on Mon Oct 28 14:37:11 2024

@author: dorle
"""

import pandas as pd
import re
import requests
import json
import urllib
import requests
from PIL import Image
from io import BytesIO
from PyPDF2 import PdfMerger
import time


df = pd.read_csv("manuscrits.csv",encoding='utf8', header=0,sep =";")

i =0
dico = {}
for url in df["URL"]:
    lien= url +"/manifest.json"
    print(lien)
    #     url = "https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000741n/manifest.json"
    images = []
    time.sleep(15) 
    
    try:
        response = requests.get(lien)
        response.raise_for_status()  # Vérifie si le statut est 200
        if response.headers["Content-Type"].startswith("application/json"):
            manifest = response.json()
        else:
            print(f"Erreur: Le contenu à {lien} n'est pas du JSON.")
            continue
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'accès au manifest: {e}")
        continue
    # try : 
    #     manifest = requests.get(lien).json()
    # except requests.exceptions.RequestException as e:
    #     print(f"Erreur lors de l'accès au manifest: {e}")
    #     continue
    pages = manifest['sequences'][0]['canvases'][7:10]
    #print (manifest['sequences'][0])
    # Limiter aux 10 premières pages
    for page in pages:
        image_url = page['images'][0]['resource']['@id']
        response = requests.get(image_url)
        if response.status_code == 200:
            # Charger l'image depuis le contenu de la réponse
            img = Image.open(BytesIO(response.content))
            images.append(img.convert("RGB"))
        
            #manifest = response.json()
            metadata = manifest.get("metadata", [])

            dico[url] = {item["label"]: item["value"] for item in metadata}
                        
            dico[url]['Language']= [lang['@value'] for lang in dico[url]['Language']]
            #dico[url]['Creator']= [creat['@value'] for creat in dico[url]['Creator']]
            
                       
            dico[url].pop('Metadata Source', None)
            dico[url].pop('Repository', None)
            dico[url].pop('Relation', None)
            dico[url].pop('Source Images', None)
                        
                            
            for doc, content in dico.items():
                if "Creator" in content :
                    
                    #cleaned_authors = [
                    #author["@value"].replace(". Auteur du texte", "").strip() 
                    #for author in content["Creator"] 
                    #if isinstance(author, dict) and "@value" in author
                #]
                    Auteur = content["Creator"]
                    print(Auteur)
                                
                    # Si l'entrée est une liste de dates
                    if isinstance(Auteur, list):
                        dates = []
                        for item in Auteur:
                            if isinstance(item, dict) and "@value" in item:
                                auteur_value = item["@value"]
                                
                                dico[url]["Creator"] = auteur_value
                        
                #                 # Si l'entrée est une date unique ou un intervalle sous forme de chaîne
                            elif isinstance(Auteur, str):
                                dico[url]["Creator"] = Auteur

                if "Date" in content:
                    date_entry = content["Date"]
                    print(date_entry)
                                
                    # Si l'entrée est une liste de dates
                    if isinstance(date_entry, list):
                        dates = []
                        for item in date_entry:
                            if isinstance(item, dict) and "@value" in item:
                                date_value = item["@value"]
                                if '-' in date_value:
                                # Si la date est un intervalle
                                    date_debut, date_fin = date_value.split('-')
                                    date_debut, date_fin = int(date_debut.strip()), int(date_fin.strip())
                                else:
                #               # Si c'est une date unique
                                    date_debut = date_fin = int(date_value.strip())
                                    # Ajout de la date transformée
                                dates.append({"dateDebut": date_debut, "dateFin": date_fin})
                                dico[url]["Date"] = dates
                        
                #                 # Si l'entrée est une date unique ou un intervalle sous forme de chaîne
                            elif isinstance(date_entry, str):
                                if '-' in date_entry:
                                # Si la date est un intervalle
                                    date_debut, date_fin = date_entry.split('-')
                                    date_debut, date_fin = int(date_debut.strip()), int(date_fin.strip())
                                else:
                #               # Si c'est une date unique
                                    date_debut = date_fin = int(date_entry.strip())

                #                     # On met la date au format uniforme
                                dico[url]["Date"] = [{"dateDebut": date_debut, "dateFin": date_fin}]
    # Le texte dans lequel on veut couper


# Les sous-chaînes entre lesquelles on veut extraire
    debut = "https://gallica.bnf.fr/iiif/ark:/12148/"
    fin = "/manifest.json"

    # Trouver l'indice de la sous-chaîne de début
    index_debut = lien.find(debut)

    # Si la sous-chaîne de début est trouvée, avancer de sa longueur
    if index_debut != -1:
        index_debut += len(debut)
    
    # Trouver l'indice de la sous-chaîne de fin après la sous-chaîne de début
        index_fin = lien.find(fin, index_debut)
    
    # Si la sous-chaîne de fin est trouvée, extraire la partie entre les deux
        if index_fin != -1:
            resultat = lien[index_debut:index_fin]
        else:
            resultat = "titre"  # Si la sous-chaîne de fin n'est pas trouvée
    else:
        resultat = "titre"  # Si la sous-chaîne de début n'est pas trouvée

 

    #title = dico[url]['Title']
    
    #short_title=title[7]
    output_pdf_path = f"{resultat}.pdf"
    
    images[0].save(output_pdf_path, save_all=True, append_images=images[1:])
                            
with open("corpus2.json", "w", encoding='utf-8-sig') as outfile: 
    json.dump(dico, outfile, ensure_ascii=False, indent=4)
                        
  #----------------------------------------------------------------------------------              
    
    #i= i+1
    #response = requests.get(lien)
    #conn = urllib.request.urlopen(lien)
    #manifest = json.loads(conn.read())
    #pages = manifest['sequences'][0]['canvases'][:10] 
    #print(manifest["sequences"][0]["canvases"][0]["images"][0]["resource"]["@id"])
    #for sequence in manifest["sequences"]:
        #canvases = sequence["canvases"]
        #for canvas in canvases[0:1]:
            #jpgfile = str(i) + ".jpg"
            #im_addr = canvas["images"][0]["resource"]["@id"]
            #print(im_addr)
            #urllib.request.urlretrieve(im_addr, jpgfile)
            
#------------------------------------------------------------
#     if response.status_code == 200:
#         # Convertir la réponse en JSON
#         manifest = response.json()
#         metadata = manifest.get("metadata", [])
#         #del dico['url']['Metadata Source']
#         dico[url] = {item["label"]: item["value"] for item in metadata}
        
#         dico[url]['Language']= [lang['@value'] for lang in dico[url]['Language']]
#         #dico[url]['Creator']= [creat['@value'] for creat in dico[url]['Creator']]
#         #dico[url]['Date']= [num['@value'] for num in dico[url]['Date']]
       
#         dico[url].pop('Metadata Source', None)
#         #del dico['url']['Metadata Source']
#         #del dico['url']['Repository']
#         dico[url].pop('Repository', None)
#         dico[url].pop('Relation', None)
#         dico[url].pop('Source Images', None)
        
            
#         for doc, content in dico.items():
#             if "Creator" in content : 
#                 cleaned_authors = [
#                     author["@value"].replace(". Auteur du texte", "").strip() 
#                     for author in content["Creator"] 
#                     if isinstance(author, dict) and "@value" in author
#                     ]
#                 print(cleaned_authors)
#         # Remplace "Creator" par une liste des noms nettoyés
#                 dico[url]["Creator"] = cleaned_authors

#                 #dico[url]['Creator']= [creat['@value'] for creat in dico[url]['Creator']]
#                 #for author in dico[url]['Creator']:
#                     #dico[url]['Creator']= author.replace('. Auteur du texte','')
#             if "Date" in content:
#                 date_entry = content["Date"]
#                 print(date_entry)
                
#                 # Si l'entrée est une liste de dates
#                 if isinstance(date_entry, list):
#                     dates = []
#                     for item in date_entry:
#                         if isinstance(item, dict) and "@value" in item:
#                             date_value = item["@value"]
#                             if '-' in date_value:
#                                 # Si la date est un intervalle
#                                 date_debut, date_fin = date_value.split('-')
#                                 date_debut, date_fin = int(date_debut.strip()), int(date_fin.strip())
#                             else:
#                                 # Si c'est une date unique
#                                 date_debut = date_fin = int(date_value.strip())
                            
#                             # Ajout de la date transformée
#                             dates.append({"dateDebut": date_debut, "dateFin": date_fin})
#                     dico[url]["Date"] = dates
        
#                 # Si l'entrée est une date unique ou un intervalle sous forme de chaîne
#                 elif isinstance(date_entry, str):
#                     if '-' in date_entry:
#                         # Si la date est un intervalle
#                         date_debut, date_fin = date_entry.split('-')
#                         date_debut, date_fin = int(date_debut.strip()), int(date_fin.strip())
#                     else:
#                         # Si c'est une date unique
#                         date_debut = date_fin = int(date_entry.strip())
#                     # 
#                     # On met la date au format uniforme
#                     dico[url]["Date"] = [{"dateDebut": date_debut, "dateFin": date_fin}]

            
# with open("corpus2.json", "w", encoding='utf-8-sig') as outfile: 
#         json.dump(dico, outfile, ensure_ascii=False, indent=4)
        
#________________________________________________________      

            
        #     date_values = [date.get('@value', '') for date in dico[url]['Date'] if '@value' in date]
        #     dico[url]['Date']= [num['@value'] for num in dico[url]['Date']]
        #     print(date_values)
        #     # Vérification si la date contient un intervalle
        #     if date_values and '-' in date_values[0]:
        #         date_debut, date_fin = date_values[0].split('-')
        #         dico[url]['Date'] = {
        #             'dateDebut': int(date_debut.strip()),
        #             'dateFin': int(date_fin.strip())
        #         }
        #     else:
        #         dico[url]['Date']['dateDebut'] = date_values
        #         dico[url]['Date']['dateFin'] = date_values
        # break
        #for date in dico[url]['Date']:
#         if 'Date' in dico[url]:
#             date_values = [date.get('@value', '') for date in dico[url]['Date'] if '@value' in date]
            
        
        
#         if '-' in dico[url]['Date']:
#             date_debut, date_fin = dico[url]['Date'].split('-')
#             dico[url]['Date']['dateDébut'] = int(date_debut)  # Conversion en entier si souhaité
#             dico[url]['Date']['dateFin'] = int(date_fin)
#             break
#         dico[url]['Date']= [lang['@value'] for lang in dico[url]['Date']]
# print(dico)        
#with open("corpus.json", "w") as outfile: 
    #json.dump(dico, outfile, ensure_ascii=False, indent=4)
    
    
    #else:
        #pass
        # # Extraire toutes les métadonnées et les afficher au format JSON
        # metadata = {
        #     "url":url,
        #     "source": manifest.get("label", "N/A"),
        #     "Description": manifest.get("description", "N/A"),
        #     "Langue": manifest.get("language", "N/A"),
        #     #manifest.get("metadata", [])
        #     "metadata": manifest.get("metadata", [])
        # }
        
        # Afficher toutes les métadonnées au format JSON
        #print(json.dumps(simplified, indent=4, ensure_ascii=False))
        #break
    
#     


# for k, v in dico.items() :
#     #for cle, valeur in v:
#     simplified_metadata = {item["label"]: item["value"] for item in v}
#     print(simplified_metadata)  
            
            
       

# # Remplacez par l'URL IIIF de votre document
# url_iiif = "https://gallica.bnf.fr/iiif/ark:/12148/btv1b11000741n/manifest.json"

# # Envoyer une requête pour obtenir le manifeste IIIF
# response = requests.get(url_iiif)

# if response.status_code == 200:
#     # Convertir la réponse en JSON
#     manifest = response.json()
    
#     # Afficher des informations de métadonnées
#     print("Titre:", manifest.get("label", "N/A"))
#     print("Description:", manifest.get("description", "N/A"))
#     print("Langue:", manifest.get("language", "N/A"))
#     print("Date de publication:", manifest.get("metadata", [{}])[0].get("value", "N/A"))

#     # Vous pouvez parcourir les métadonnées supplémentaires
#     for metadata_entry in manifest.get("metadata", []):
#         print(f"{metadata_entry.get('label', 'N/A')}: {metadata_entry.get('value', 'N/A')}")
# else:
#     print("Erreur lors de la récupération du manifeste:", response.status_code)


# # Charger le fichier CSV
# df = pd.read_csv("manuscrits2.csv",encoding='utf8', header=0,sep =";")
# #df2 = pd.read_csv("manuscrits2.csv",encoding='utf8', header=0,sep =";")

# df['DROITS'] = df['DROITS'].str.replace(r'(domaine public|public domain)', 'Domaine Public', regex=True)
# df['TYPE'] = df['TYPE'].str.lower()


# titres= df['TITRE']
# df['titre_arabe'] = pd.Series(dtype='string')
# i=0
# for t in titres :  
#     caracteres_arabes = re.findall(r'[\u0600-\u06FF]+', t)

#     # Joindre les caractères arabes détectés en une seule chaîne
#     resultat_arabe = ''.join(caracteres_arabes)
#     t.replace(resultat_arabe, '')
#     df.loc[i, 'titre_arabe'] = resultat_arabe
#     i = i+1
# df.to_csv('out2.csv', index=False)  


    