/* ==========================================================================
   ARCHIVO — datos de demostración
   --------------------------------------------------------------------------
   Todo el contenido del archivo vive en este fichero. La lógica de la página
   (js/archivo.js) y los estilos (css/archivo.css) NO contienen ninguna pieza.

   Para sustituir el contenido ficticio por trabajos reales:
     1. Copia tus imágenes a assets/archivo/ (imagen grande) y, opcionalmente,
        a assets/archivo/thumbs/ (miniatura de ~640 px de lado largo).
     2. Edita / añade / borra objetos en `pieces`. Campos:
          id          identificador único (texto)
          title       título
          year        año (número); también se encuentra con el buscador
          type        proyecto | fotografía | boceto | cartel | editorial |
                      fragmento | color | nota
          category    etiqueta libre que se muestra en la ficha (Arquitectura, ...)
          categories  lista de categorías del filtro «Filtrar» (una o varias)
                      p. ej. ["Ropa"] o ["Ropa", "Fotografía"]
          description texto breve
          tags        lista de etiquetas (se usan en la búsqueda)
          image       nombre de archivo dentro de assets/archivo/ (omitir en notas)
          thumb       miniatura (opcional; si falta se usa `image`)
          ratio       ancho / alto de la imagen (reserva el espacio al cargar)
          groupId     id de un grupo de `groups` (opcional)
          size        xs | s | m | l   -> peso visual dentro del tablero
          align       l | c | r        -> posición horizontal
          rot         giro en grados (p. ej. -2, 1.5, 0)
          valign      start | center | end (solo dentro de series)
          text, tone  solo para type "nota": texto y color (paper|yellow|ink|red)
     3. El menú «Filtrar» se genera con las `categories` de las piezas.
        `window.ARCHIVO.categories` solo fija el ORDEN del menú; una categoría
        nueva usada en una pieza aparece sola al final.
   El orden del array es el orden en el tablero.
   Un grupo (`groups`) agrupa piezas con el mismo `groupId` en una serie;
   kind "wide" ocupa todo el ancho del tablero, "col" una sola columna.
   ========================================================================== */
window.ARCHIVO = {
  "basePath": "assets/archivo/",
  "groups": [
    {
      "id": "g-marca",
      "title": "Una marca imaginaria",
      "year": 2025,
      "kind": "col",
      "note": "Sistema de identidad para un taller de cerámica que no existe."
    },
    {
      "id": "g-tipo",
      "title": "Tipografías encontradas",
      "year": 2023,
      "kind": "col",
      "note": "Letras que alguien dibujó para otra cosa."
    },
    {
      "id": "g-arq",
      "title": "Notas para otra ciudad",
      "year": 2024,
      "kind": "wide",
      "note": "Cuatro fotografías de un mismo paseo, sin prisa."
    },
    {
      "id": "g-color",
      "title": "Archivo cromático",
      "year": 2026,
      "kind": "col",
      "note": "Pruebas de color de todo un año."
    },
    {
      "id": "g-hueco",
      "title": "Hueco, n.º 7",
      "year": 2025,
      "kind": "wide",
      "note": "Proyecto editorial ficticio: portada, doble página y una apertura."
    },
    {
      "id": "g-invierno",
      "title": "Formas de invierno",
      "year": 2023,
      "kind": "col",
      "note": "Tres fotografías en blanco y negro, febrero."
    }
  ],
  "pieces": [
    {
      "id": "a01",
      "title": "Orilla — logotipo",
      "year": 2025,
      "type": "proyecto",
      "category": "Identidad visual",
      "description": "Un círculo cortado por tres olas y una cursiva que respira. Marca ficticia para un taller que no existe.",
      "tags": [
        "identidad",
        "logotipo",
        "cerámica",
        "ficticio"
      ],
      "image": "marca-logotipo.jpg",
      "thumb": "thumbs/marca-logotipo.jpg",
      "ratio": 1.25,
      "groupId": "g-marca",
      "size": "l",
      "align": "l",
      "rot": 0,
      "categories": [
        "Branding"
      ]
    },
    {
      "id": "a02",
      "title": "Orilla — tarjetas",
      "year": 2025,
      "type": "proyecto",
      "category": "Identidad visual",
      "description": "Frente claro, dorso oscuro. La pieza más barata de producir y la que más se guarda.",
      "tags": [
        "papelería",
        "tarjetas",
        "cobalto"
      ],
      "image": "marca-tarjetas.jpg",
      "thumb": "thumbs/marca-tarjetas.jpg",
      "ratio": 1,
      "groupId": "g-marca",
      "size": "s",
      "align": "r",
      "rot": -2.2,
      "categories": [
        "Branding"
      ]
    },
    {
      "id": "a03",
      "title": "Orilla — patrón",
      "year": 2025,
      "type": "proyecto",
      "category": "Identidad visual",
      "description": "Cuatro formas que se repiten hasta convertirse en superficie. Pensado para papel de envolver.",
      "tags": [
        "patrón",
        "geometría",
        "color"
      ],
      "image": "marca-patron.jpg",
      "thumb": "thumbs/marca-patron.jpg",
      "ratio": 1,
      "groupId": "g-marca",
      "size": "xs",
      "align": "l",
      "rot": 1.6,
      "valign": "end",
      "categories": [
        "Branding"
      ]
    },
    {
      "id": "a04",
      "title": "Orilla — etiquetas",
      "year": 2025,
      "type": "proyecto",
      "category": "Identidad visual",
      "description": "Etiquetas redondas por lote, en cinco colores sobre kraft.",
      "tags": [
        "etiquetas",
        "lote",
        "kraft"
      ],
      "image": "marca-etiquetas.jpg",
      "thumb": "thumbs/marca-etiquetas.jpg",
      "ratio": 1.455,
      "groupId": "g-marca",
      "size": "m",
      "align": "c",
      "rot": 0,
      "categories": [
        "Branding",
        "Objetos"
      ]
    },
    {
      "id": "a05",
      "title": "Nota — espacio",
      "year": 2024,
      "type": "nota",
      "category": "Nota",
      "description": "Dejar espacio. Siempre más del que parece necesario.",
      "tags": [
        "espacio",
        "método"
      ],
      "text": "Dejar espacio. Siempre más del que parece necesario.",
      "tone": "yellow",
      "size": "s",
      "align": "r",
      "rot": -2,
      "categories": [
        "Editorial"
      ]
    },
    {
      "id": "a06",
      "title": "Hombre cruzando",
      "year": 2023,
      "type": "fotografía",
      "category": "Fotografía urbana",
      "description": "Una figura pequeña, rayas blancas y mucho gris. La escala lo decide todo.",
      "tags": [
        "calle",
        "figura",
        "asfalto"
      ],
      "image": "urbana-cruce.jpg",
      "thumb": "thumbs/urbana-cruce.jpg",
      "ratio": 0.8,
      "size": "m",
      "align": "r",
      "rot": 1.4,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a47",
      "title": "Nota — ritmo",
      "year": 2026,
      "type": "nota",
      "category": "Nota",
      "description": "Un plano dura lo que tarda en entenderse. Ni un segundo más.",
      "text": "Un plano dura lo que tarda en entenderse. Ni un segundo más.",
      "tags": [
        "ritmo",
        "montaje",
        "método"
      ],
      "categories": [
        "Vídeo"
      ],
      "tone": "yellow",
      "size": "s",
      "align": "r",
      "rot": -1.2
    },
    {
      "id": "a07",
      "title": "Estudio 04",
      "year": 2026,
      "type": "cartel",
      "category": "Cartelería",
      "description": "Cuatro formas sobre negro. Un ejercicio de equilibrio que se resuelve mal a propósito.",
      "tags": [
        "cartel",
        "geometría",
        "experimento",
        "composición"
      ],
      "image": "cartel-estudio-04.jpg",
      "thumb": "thumbs/cartel-estudio-04.jpg",
      "ratio": 0.75,
      "size": "l",
      "align": "l",
      "rot": 0,
      "categories": [
        "Carteles",
        "Experimentos"
      ]
    },
    {
      "id": "a08",
      "title": "Asfalto mojado",
      "year": 2025,
      "type": "fotografía",
      "category": "Textura",
      "description": "Gotas sobre piedra oscura. Un fondo posible para otra cosa.",
      "tags": [
        "textura",
        "lluvia",
        "gris"
      ],
      "image": "textura-asfalto.jpg",
      "thumb": "thumbs/textura-asfalto.jpg",
      "ratio": 1,
      "size": "s",
      "align": "l",
      "rot": -1.6,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a09",
      "title": "Retícula, intento 3",
      "year": 2024,
      "type": "boceto",
      "category": "Maquetación",
      "description": "Doce columnas por ocho filas y demasiada rigidez. Anotado a lápiz en la esquina: «demasiado rígida».",
      "tags": [
        "retícula",
        "módulo",
        "apuntes"
      ],
      "image": "boceto-reticula.jpg",
      "thumb": "thumbs/boceto-reticula.jpg",
      "ratio": 1.4,
      "size": "m",
      "align": "r",
      "rot": 1,
      "categories": [
        "Editorial",
        "Experimentos"
      ]
    },
    {
      "id": "a38",
      "title": "Sudadera — prueba de estampado",
      "year": 2025,
      "type": "proyecto",
      "category": "Ropa",
      "description": "La marca de Orilla llevada a una sudadera negra. Sirve para ver cómo se comporta el símbolo sobre tejido.",
      "tags": [
        "sudadera",
        "estampado",
        "merchandising",
        "ficticio",
        "invierno"
      ],
      "image": "ropa-sudadera.jpg",
      "categories": [
        "Ropa",
        "Branding"
      ],
      "size": "m",
      "align": "l",
      "rot": -1,
      "thumb": "thumbs/ropa-sudadera.jpg",
      "ratio": 0.8
    },
    {
      "id": "a10",
      "title": "Reloj, seis y media",
      "year": 2023,
      "type": "fotografía",
      "category": "Tipografía",
      "description": "Los numerales de una esfera soviética. Hay un 6 que es casi un caligrama.",
      "tags": [
        "numerales",
        "reloj",
        "encontrado"
      ],
      "image": "tipo-reloj.jpg",
      "thumb": "thumbs/tipo-reloj.jpg",
      "ratio": 1,
      "groupId": "g-tipo",
      "size": "m",
      "align": "l",
      "rot": -1.2,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a11",
      "title": "Matrícula 956",
      "year": 2023,
      "type": "fotografía",
      "category": "Tipografía",
      "description": "Escritura tailandesa sobre una matrícula amarilla. No sé leerla, y por eso la miro más.",
      "tags": [
        "letras",
        "matrícula",
        "escritura"
      ],
      "image": "tipo-matricula.jpg",
      "thumb": "thumbs/tipo-matricula.jpg",
      "ratio": 1.5,
      "groupId": "g-tipo",
      "size": "l",
      "align": "r",
      "rot": 0.8,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a12",
      "title": "Symbol",
      "year": 2023,
      "type": "fotografía",
      "category": "Tipografía",
      "description": "Un libro de símbolos con el título girado en el lomo. Hay que leerlo de lado.",
      "tags": [
        "tipografía",
        "libro",
        "lomo"
      ],
      "image": "tipo-simbolo.jpg",
      "thumb": "thumbs/tipo-simbolo.jpg",
      "ratio": 0.8,
      "groupId": "g-tipo",
      "size": "s",
      "align": "l",
      "rot": 1.8,
      "valign": "end",
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a44",
      "title": "Los márgenes — cubierta",
      "year": 2024,
      "type": "editorial",
      "category": "Portadas",
      "description": "Cubierta de un libro de ensayos que no existe. Un bloque rojo y un círculo que se sale.",
      "tags": [
        "libro",
        "cubierta",
        "tipografía",
        "ficticio"
      ],
      "image": "portada-libro.jpg",
      "categories": [
        "Portadas",
        "Editorial"
      ],
      "size": "m",
      "align": "l",
      "rot": 1,
      "thumb": "thumbs/portada-libro.jpg",
      "ratio": 0.667
    },
    {
      "id": "a13",
      "title": "Nota — carteles",
      "year": 2025,
      "type": "nota",
      "category": "Nota",
      "description": "Un cartel no explica: insiste.",
      "tags": [
        "cartel",
        "método"
      ],
      "text": "Un cartel no explica: insiste.",
      "tone": "ink",
      "size": "s",
      "align": "r",
      "rot": 1.5,
      "categories": [
        "Carteles"
      ]
    },
    {
      "id": "a14",
      "title": "Búnker, mediodía",
      "year": 2024,
      "type": "fotografía",
      "category": "Arquitectura",
      "description": "Un volumen de hormigón contra un cielo demasiado limpio. Me interesaba el peso.",
      "tags": [
        "hormigón",
        "volumen",
        "cielo"
      ],
      "image": "arq-bunker.jpg",
      "thumb": "thumbs/arq-bunker.jpg",
      "ratio": 1.5,
      "groupId": "g-arq",
      "size": "l",
      "align": "l",
      "rot": 0,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a41",
      "title": "Plano 07 — después de la lluvia",
      "year": 2026,
      "type": "fragmento",
      "category": "Vídeo",
      "description": "Fotograma de un cortometraje sin terminar. Corrección de color pensada para que el paisaje parezca recordado.",
      "tags": [
        "vídeo",
        "fotograma",
        "paisaje",
        "corrección de color"
      ],
      "image": "video-fotograma.jpg",
      "categories": [
        "Vídeo"
      ],
      "size": "l",
      "align": "l",
      "rot": -0.6,
      "thumb": "thumbs/video-fotograma.jpg",
      "ratio": 1.778
    },
    {
      "id": "a15",
      "title": "Puerta de dos hojas",
      "year": 2024,
      "type": "fotografía",
      "category": "Arquitectura",
      "description": "La simetría interrumpida por una grieta en el enlucido.",
      "tags": [
        "puerta",
        "madera",
        "fachada"
      ],
      "image": "arq-puerta.jpg",
      "thumb": "thumbs/arq-puerta.jpg",
      "ratio": 0.8,
      "groupId": "g-arq",
      "size": "xs",
      "align": "r",
      "rot": -1.8,
      "valign": "center",
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a16",
      "title": "Estructura",
      "year": 2024,
      "type": "fotografía",
      "category": "Arquitectura",
      "description": "Triángulos repetidos hasta volverse ritmo.",
      "tags": [
        "acero",
        "geometría",
        "ritmo"
      ],
      "image": "arq-puente.jpg",
      "thumb": "thumbs/arq-puente.jpg",
      "ratio": 0.8,
      "groupId": "g-arq",
      "size": "xs",
      "align": "l",
      "rot": 1.2,
      "valign": "start",
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a17",
      "title": "Banco frente a la cal",
      "year": 2024,
      "type": "fotografía",
      "category": "Arquitectura",
      "description": "Un banco y una pared blanca. Casi un cartel.",
      "tags": [
        "banco",
        "blanco",
        "minimal"
      ],
      "image": "arq-banco.jpg",
      "thumb": "thumbs/arq-banco.jpg",
      "ratio": 1,
      "groupId": "g-arq",
      "size": "m",
      "align": "r",
      "rot": -0.8,
      "valign": "end",
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a18",
      "title": "Cartel para nadie",
      "year": 2023,
      "type": "cartel",
      "category": "Cartelería",
      "description": "Dos palabras de cuatro letras cortadas por el borde. La lectura es el experimento.",
      "tags": [
        "cartel",
        "tipografía",
        "rojo",
        "recorte"
      ],
      "image": "cartel-para-nadie.jpg",
      "thumb": "thumbs/cartel-para-nadie.jpg",
      "ratio": 0.75,
      "size": "m",
      "align": "l",
      "rot": 0,
      "categories": [
        "Carteles"
      ]
    },
    {
      "id": "a19",
      "title": "Cuatro carriles",
      "year": 2025,
      "type": "fotografía",
      "category": "Fotografía urbana",
      "description": "Vista cenital de un cruce. Las líneas de pintura hacen de retícula.",
      "tags": [
        "ciudad",
        "tráfico",
        "cenital",
        "blanco y negro"
      ],
      "image": "urbana-carriles.jpg",
      "thumb": "thumbs/urbana-carriles.jpg",
      "ratio": 1,
      "size": "s",
      "align": "r",
      "rot": -1,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a45",
      "title": "Lado B — portada de disco",
      "year": 2023,
      "type": "editorial",
      "category": "Portadas",
      "description": "Círculos concéntricos desplazados hasta que el centro parece moverse.",
      "tags": [
        "disco",
        "portada",
        "círculos",
        "cobalto"
      ],
      "image": "portada-disco.jpg",
      "categories": [
        "Portadas",
        "Experimentos"
      ],
      "size": "m",
      "align": "c",
      "rot": -1.8,
      "thumb": "thumbs/portada-disco.jpg",
      "ratio": 1
    },
    {
      "id": "a20",
      "title": "Archivo cromático — hoja 01",
      "year": 2026,
      "type": "color",
      "category": "Color",
      "description": "La paleta principal del año: siete tintas y sus nombres provisionales.",
      "tags": [
        "paleta",
        "color",
        "tinta"
      ],
      "image": "cromatico-barras.jpg",
      "thumb": "thumbs/cromatico-barras.jpg",
      "ratio": 1.455,
      "groupId": "g-color",
      "size": "l",
      "align": "l",
      "rot": 0,
      "categories": [
        "Experimentos"
      ]
    },
    {
      "id": "a21",
      "title": "Archivo cromático — fichas",
      "year": 2026,
      "type": "color",
      "category": "Color",
      "description": "Dieciséis pruebas a cuatro valores. Casi todas acaban en gris.",
      "tags": [
        "paleta",
        "valores",
        "pruebas"
      ],
      "image": "cromatico-fichas.jpg",
      "thumb": "thumbs/cromatico-fichas.jpg",
      "ratio": 1,
      "groupId": "g-color",
      "size": "s",
      "align": "r",
      "rot": 1.8,
      "categories": [
        "Experimentos"
      ]
    },
    {
      "id": "a22",
      "title": "Archivo cromático — superposición",
      "year": 2026,
      "type": "color",
      "category": "Color",
      "description": "Tres tintas transparentes superpuestas. El negro aparece solo.",
      "tags": [
        "superposición",
        "transparencia",
        "color"
      ],
      "image": "cromatico-circulos.jpg",
      "thumb": "thumbs/cromatico-circulos.jpg",
      "ratio": 1.4,
      "groupId": "g-color",
      "size": "m",
      "align": "l",
      "rot": -1.2,
      "categories": [
        "Experimentos"
      ]
    },
    {
      "id": "a39",
      "title": "Tres camisetas, una tirada",
      "year": 2026,
      "type": "proyecto",
      "category": "Ropa",
      "description": "Serigrafía a una sola tinta sobre tres colores de tela. Una palabra, un numeral y una letra.",
      "tags": [
        "camisetas",
        "serigrafía",
        "color",
        "ficticio"
      ],
      "image": "ropa-camisetas.jpg",
      "categories": [
        "Ropa"
      ],
      "size": "l",
      "align": "c",
      "rot": 0.8,
      "thumb": "thumbs/ropa-camisetas.jpg",
      "ratio": 1.6
    },
    {
      "id": "a23",
      "title": "Q en construcción",
      "year": 2023,
      "type": "boceto",
      "category": "Tipografía",
      "description": "La cola de la Q, otra vez. Línea base, altura x y mayúsculas sobre papel.",
      "tags": [
        "tipografía",
        "letra",
        "construcción"
      ],
      "image": "boceto-letra-q.jpg",
      "thumb": "thumbs/boceto-letra-q.jpg",
      "ratio": 0.8,
      "size": "m",
      "align": "c",
      "rot": -1,
      "categories": [
        "Experimentos"
      ]
    },
    {
      "id": "a24",
      "title": "Zapatos sobre rojo",
      "year": 2026,
      "type": "fotografía",
      "category": "Objetos",
      "description": "Dos zapatos blancos contra una pared roja. El color hace todo el trabajo.",
      "tags": [
        "objeto",
        "rojo",
        "color"
      ],
      "image": "objeto-zapatos.jpg",
      "thumb": "thumbs/objeto-zapatos.jpg",
      "ratio": 1.5,
      "size": "m",
      "align": "r",
      "rot": 1.5,
      "categories": [
        "Ropa",
        "Fotografía"
      ]
    },
    {
      "id": "a25",
      "title": "Nota — carpeta",
      "year": 2026,
      "type": "nota",
      "category": "Nota",
      "description": "Ideas que sobreviven a tres versiones: guardar. El resto, también, pero en otra carpeta.",
      "tags": [
        "método",
        "archivo"
      ],
      "text": "Ideas que sobreviven a tres versiones: guardar. El resto, también, pero en otra carpeta.",
      "tone": "paper",
      "size": "m",
      "align": "l",
      "rot": 1.2,
      "categories": [
        "Experimentos"
      ]
    },
    {
      "id": "a26",
      "title": "Hueco, n.º 7 — portada",
      "year": 2025,
      "type": "editorial",
      "category": "Diseño editorial",
      "description": "Dúo-tono en rojo y una cabecera que no cabe. El título sale por los bordes.",
      "tags": [
        "revista",
        "portada",
        "dúo-tono",
        "tipografía"
      ],
      "image": "hueco-portada.jpg",
      "thumb": "thumbs/hueco-portada.jpg",
      "ratio": 0.75,
      "groupId": "g-hueco",
      "size": "m",
      "align": "l",
      "rot": -1,
      "valign": "start",
      "categories": [
        "Portadas",
        "Editorial"
      ]
    },
    {
      "id": "a27",
      "title": "Hueco, n.º 7 — doble página",
      "year": 2025,
      "type": "editorial",
      "category": "Diseño editorial",
      "description": "Una fotografía a página y un texto a dos columnas. El margen interior hace casi todo el trabajo.",
      "tags": [
        "revista",
        "maquetación",
        "fotografía"
      ],
      "image": "hueco-doble-pagina.jpg",
      "thumb": "thumbs/hueco-doble-pagina.jpg",
      "ratio": 1.455,
      "groupId": "g-hueco",
      "size": "l",
      "align": "r",
      "rot": 0.8,
      "valign": "center",
      "categories": [
        "Editorial"
      ]
    },
    {
      "id": "a42",
      "title": "Storyboard, hoja 1",
      "year": 2025,
      "type": "boceto",
      "category": "Vídeo",
      "description": "Seis viñetas y sus tiempos. Una hoja de trabajo antes de rodar nada.",
      "tags": [
        "storyboard",
        "vídeo",
        "planos",
        "apuntes"
      ],
      "image": "video-storyboard.jpg",
      "categories": [
        "Vídeo",
        "Experimentos"
      ],
      "size": "m",
      "align": "c",
      "rot": 1.2,
      "thumb": "thumbs/video-storyboard.jpg",
      "ratio": 1.455
    },
    {
      "id": "a28",
      "title": "Hueco, n.º 7 — apertura",
      "year": 2025,
      "type": "fragmento",
      "category": "Diseño editorial",
      "description": "El número del ejemplar como único gesto gráfico y una cita corta.",
      "tags": [
        "numeral",
        "cita",
        "rojo"
      ],
      "image": "hueco-detalle.jpg",
      "thumb": "thumbs/hueco-detalle.jpg",
      "ratio": 1,
      "groupId": "g-hueco",
      "size": "xs",
      "align": "l",
      "rot": 2,
      "valign": "end",
      "categories": [
        "Editorial"
      ]
    },
    {
      "id": "a29",
      "title": "Festival de invierno imaginario",
      "year": 2024,
      "type": "cartel",
      "category": "Cartelería",
      "description": "Un punto de trama que se disuelve hacia los bordes y un numeral de 380 puntos. Festival inventado.",
      "tags": [
        "cartel",
        "trama",
        "ficticio",
        "cobalto"
      ],
      "image": "cartel-festival.jpg",
      "thumb": "thumbs/cartel-festival.jpg",
      "ratio": 0.75,
      "size": "m",
      "align": "l",
      "rot": -1,
      "categories": [
        "Carteles"
      ]
    },
    {
      "id": "a30",
      "title": "Mercado de noche",
      "year": 2026,
      "type": "fotografía",
      "category": "Fotografía urbana",
      "description": "Una calle cubierta de bombillas. Me pareció un cartel con demasiada información.",
      "tags": [
        "noche",
        "luces",
        "calle"
      ],
      "image": "urbana-mercado.jpg",
      "thumb": "thumbs/urbana-mercado.jpg",
      "ratio": 0.8,
      "size": "s",
      "align": "r",
      "rot": 1.2,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a40",
      "title": "Camiseta tipográfica — espécimen 3",
      "year": 2024,
      "type": "proyecto",
      "category": "Ropa",
      "description": "Una «Aa» a escala de pecho. La tipografía como estampado, sin nada más.",
      "tags": [
        "camiseta",
        "tipografía",
        "espécimen"
      ],
      "image": "ropa-camiseta-tipo.jpg",
      "categories": [
        "Ropa",
        "Experimentos"
      ],
      "size": "s",
      "align": "r",
      "rot": 1.5,
      "thumb": "thumbs/ropa-camiseta-tipo.jpg",
      "ratio": 1
    },
    {
      "id": "a31",
      "title": "Piñas sobre madera",
      "year": 2023,
      "type": "fotografía",
      "category": "Naturaleza",
      "description": "Dos piñas y un fondo de veta. El grano hace de color.",
      "tags": [
        "invierno",
        "blanco y negro",
        "textura"
      ],
      "image": "invierno-pinas.jpg",
      "thumb": "thumbs/invierno-pinas.jpg",
      "ratio": 0.8,
      "groupId": "g-invierno",
      "size": "m",
      "align": "l",
      "rot": -1.5,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a32",
      "title": "Hierba, grano",
      "year": 2023,
      "type": "fotografía",
      "category": "Naturaleza",
      "description": "Una mancha de hierba helada vista casi como tejido.",
      "tags": [
        "invierno",
        "blanco y negro",
        "grano"
      ],
      "image": "invierno-hierba.jpg",
      "thumb": "thumbs/invierno-hierba.jpg",
      "ratio": 1.5,
      "groupId": "g-invierno",
      "size": "l",
      "align": "r",
      "rot": 0.8,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a33",
      "title": "Cresta",
      "year": 2023,
      "type": "fotografía",
      "category": "Naturaleza",
      "description": "El valle desaparece detrás de una piedra. Formato alargado, a propósito.",
      "tags": [
        "invierno",
        "blanco y negro",
        "paisaje"
      ],
      "image": "invierno-cresta.jpg",
      "thumb": "thumbs/invierno-cresta.jpg",
      "ratio": 2,
      "groupId": "g-invierno",
      "size": "l",
      "align": "l",
      "rot": 0,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a43",
      "title": "Rótulo «Hueco» — prueba 04",
      "year": 2024,
      "type": "fragmento",
      "category": "Vídeo",
      "description": "Línea de tiempo con tres capas de animación. El título tarda dieciocho segundos en llegar.",
      "tags": [
        "animación",
        "título",
        "línea de tiempo",
        "movimiento"
      ],
      "image": "video-rotulo.jpg",
      "categories": [
        "Vídeo",
        "Experimentos"
      ],
      "size": "m",
      "align": "r",
      "rot": -1.4,
      "thumb": "thumbs/video-rotulo.jpg",
      "ratio": 1.778
    },
    {
      "id": "a34",
      "title": "Módulos — doce miniaturas",
      "year": 2026,
      "type": "boceto",
      "category": "Composición",
      "description": "Doce pequeñas composiciones antes de decidir cuál merecía ser un cartel.",
      "tags": [
        "miniaturas",
        "módulos",
        "composición",
        "color"
      ],
      "image": "boceto-modulos.jpg",
      "thumb": "thumbs/boceto-modulos.jpg",
      "ratio": 1,
      "size": "m",
      "align": "c",
      "rot": 1,
      "categories": [
        "Experimentos"
      ]
    },
    {
      "id": "a35",
      "title": "Tablones y hojas",
      "year": 2026,
      "type": "fotografía",
      "category": "Textura",
      "description": "Madera gastada con hojas caídas. Orden y accidente en la misma superficie.",
      "tags": [
        "madera",
        "textura",
        "otoño"
      ],
      "image": "textura-tablones.jpg",
      "thumb": "thumbs/textura-tablones.jpg",
      "ratio": 1.25,
      "size": "s",
      "align": "l",
      "rot": 2,
      "categories": [
        "Fotografía"
      ]
    },
    {
      "id": "a46",
      "title": "Tote bag de algodón crudo",
      "year": 2025,
      "type": "proyecto",
      "category": "Objetos",
      "description": "El mismo símbolo, ahora en una bolsa. Fondo mostaza, el único color que no estaba previsto.",
      "tags": [
        "bolsa",
        "objeto",
        "merchandising",
        "mostaza"
      ],
      "image": "objeto-tote.jpg",
      "categories": [
        "Objetos",
        "Branding"
      ],
      "size": "s",
      "align": "l",
      "rot": 1.4,
      "thumb": "thumbs/objeto-tote.jpg",
      "ratio": 0.8
    },
    {
      "id": "a36",
      "title": "Packaging sin producto",
      "year": 2025,
      "type": "proyecto",
      "category": "Packaging",
      "description": "Un troquel para una caja que todavía no contiene nada. Primero el contenedor, luego la historia.",
      "tags": [
        "packaging",
        "troquel",
        "caja",
        "kraft"
      ],
      "image": "packaging-troquel.jpg",
      "thumb": "thumbs/packaging-troquel.jpg",
      "ratio": 1.333,
      "size": "l",
      "align": "r",
      "rot": -0.8,
      "categories": [
        "Objetos"
      ]
    },
    {
      "id": "a37",
      "title": "Nota — papel",
      "year": 2023,
      "type": "nota",
      "category": "Nota",
      "description": "Preguntar al papel qué quiere ser.",
      "tags": [
        "papel",
        "método"
      ],
      "text": "Preguntar al papel qué quiere ser.",
      "tone": "red",
      "size": "s",
      "align": "l",
      "rot": -2.2,
      "categories": [
        "Objetos"
      ]
    }
  ],
  "categories": [
    "Ropa",
    "Vídeo",
    "Portadas",
    "Fotografía",
    "Branding",
    "Editorial",
    "Carteles",
    "Objetos",
    "Experimentos"
  ]
};
