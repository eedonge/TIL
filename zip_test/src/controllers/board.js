import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const afterUploadImage = (req, res) => {
    console.log("req.file = ", req.file);
    res.json({ url: `/img/${req.file.filename}` });
};

// 게시글 등록
export const uploadBoard = async(req, res, next) => {
    console.log('게시글 등록 시작!');
    try {
        const { roomType, address, addressDetail, roomArea, roomInfo, rentType, month, deposit, cost, roomCost, selectDate, datePicker, totalfloor, floorsNumber, elevator, parking, parkingCost, title, textArea } = req.body;
        //const images = Array.isArray(req.body.url) ? req.body.url.map((image) => ({ name: image })) : [];
        const imageUrl = req.body.roomImage || [];

        const board = await prisma.board.create({
            data: {
                roomType,           // 원룸 투룸
                address,        // 주소
                addressDetail,  // 상세주소
                roomArea,         // 평수
                roomInfo,          // 오픈형, 분리형, 복층형

                rentType,          // 월세 전세
                deposit,        // 보증금
                month,       // 월세
                cost,    // 유무
                roomCost,   // 관리비

                selectDate,
                datePicker,       // 입주가능날짜

                totalfloor,       // 전체 층 수
                floorsNumber,          // 층수

                elevator,       // 엘리베이터 유무
                parking,        // 주차유무
                parkingCost,   // 주차비
                
                roomImage: imageUrl,

                title,          // 게시글 제목
                textArea,        // 게시글 내용

                userId: req.user.id
            },
            
            
        });
        //console.log(board, imageUrl);
        //res.status(200).json({ board, imageUrl });
        res.status(200).json('게시글 등록 완료');
    } catch (error) {
        console.error(error);
        res.status(400).json('게시글을 업로드 할 수 없습니다.');
    }
};

// 게시글 삭제
export const deleteBoard = async (req, res, next) => {
    try {
        const seqId = parseInt(req.params.id, 10);
        const board = await prisma.board.delete({ where: {seq: seqId, userId: req.user.id }});
       if(board){
            res.status(200).send('게시글을 삭제했습니다.');
       }else{
        res.status(404).send('게시글 삭제를 실패하였습니다.')
       }
    } catch (error) {
        console.error(error);
        res.status(500).send('게시글 삭제 중 오류가 발생했습니다.');
    }
};



// 게시글 수정
/*
export const updateBoard = async (req, res, next) => {
    try {
        const seqId = parseInt(req.params.id, 10);
        console.log('seqId:', seqId);
        const board = await prisma.board.findFirst({ where: {seq: seqId, userId: req.user.id }});
        console.log('board:', board);

        const { deposit, month, roomCost, datePicker, title, textArea } = req.body;
        const imageUrl = req.body.roomImage || [];
        const imageUpdateData = Array.isArray(imageUrl)
  ? imageUrl.map(url => ({ where: { url }, data: { url } }))
  : [];
        if(board) {
            await prisma.board.update({
                where: { seq: board.seq },
                data: {
                    deposit,
                    month,
                    roomCost,
                    datePicker,
                    title,
                    textArea,
                    roomImage: {
                        set: imageUpdateData,
                      },
                },
            });
            res.send('게시글이 수정됐습니다.');
        } else {
            res.status(404).send('게시글이 존재하지 않습니다.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('게시글 수정 중 오류가 발생했습니다.');
        next(error);
    }
};
*/
export const updateBoard = async (req, res, next) => {
    try {
        const seqId = parseInt(req.params.id, 10);
        console.log('seqId:', seqId);
        const board = await prisma.board.findFirst({ where: { seq: seqId, userId: req.user.id } });
        console.log('board:', board);

        const { deposit, month, roomCost, datePicker, title, textArea } = req.body;
        // req.body.roomImage가 배열이 아니면 배열로 변환
        const newImageUrls = Array.isArray(req.body.roomImage) ? req.body.roomImage : [req.body.roomImage];

        if (board) {
            // 현재 게시글에 연결된 모든 이미지 가져오기
            const currentImages = await prisma.image.findMany({
                where: { boardId: board.seq },
            });

            // 새 이미지와 현재 이미지를 비교하여 추가된 이미지와 삭제된 이미지 식별
            const addedImages = newImageUrls.filter(newImage => !currentImages.some(currentImage => currentImage.url === newImage));
            const deletedImages = currentImages.filter(currentImage => !newImageUrls.includes(currentImage.url));

            // 추가된 이미지를 데이터베이스에 추가
            if (addedImages.length > 0) {
                const imagesToUpdate = addedImages[0].update.map(image => ({ url: image.url, boardId: board.seq }));

                await prisma.image.createMany({
                    data: imagesToUpdate,
                });
                
                // 추가 후 이미지 가져와서 확인
                const updatedImages = await prisma.image.findMany({
                    where: { boardId: board.seq },
                });
                console.log('Updated Images:', updatedImages);
            }
            

            // 삭제된 이미지를 데이터베이스에서 삭제
            if (deletedImages.length > 0) {
                await prisma.image.deleteMany({
                    where: {
                        boardId: board.seq,
                        url: {
                            in: deletedImages.map(image => image.url),
                        },
                    },
                });
            }

            // 게시글 업데이트
            await prisma.board.update({
                where: { seq: board.seq },
                data: {
                    deposit,
                    month,
                    roomCost,
                    datePicker,
                    title,
                    textArea,
                },
            });

            res.status(200).send('게시글이 수정됐습니다.');
        } else {
            res.status(404).send('게시글이 존재하지 않습니다.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('게시글 수정 중 오류가 발생했습니다.');
        next(error);
    }
};

export const Like = async(req, res, next) => {
    try {
        const board = await prisma.board.findFirst({ where: { id: req.params.id }});

        if(!board){
            return res.status(404).send('없는 게시글 입니다.');
        }

        await prisma.board.update({
            where: { id: board.id },
            data: {
                likes: {
                    connect: { id: req.user.id }
                }
            }
        });
        res.send('좋아요');
    } catch(error) {
        console.log(error);
        next(error);
    }
};

export const unLike = async(req, res, next) => {
    try {
        const board = await prisma.board.findFirst({ where: { id: req.params.id }});

        if(!board){
            return res.status(404).send('없는 게시글 입니다.');
        }

        await prisma.board.update({
            where: { id: board.id },
            data: {
                likes: {
                    disconnect: { id: req.user.id }
                }
            }
        });
        res.send('좋아요 취소');
    } catch (error) {
        console.log(error);
        next(error);
    }
};