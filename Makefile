WDGT_DIR = "Milk the Cow.wdgt"

PREFIX = ..
DIST_DIR = ${PREFIX}/releases

all: install 

install:
	@@rm -rf ~/Library/Widgets/${WDGT_DIR}
	@@cp -R ${WDGT_DIR} ~/Library/Widgets/

${DIST_DIR}:
	@@mkdir -p ${DIST_DIR}

dist: ${DIST_DIR}
	@@rm -f ${DIST_DIR}/milkthecow.zip
	@@zip -r ${DIST_DIR}/milkthecow.zip ${WDGT_DIR}
