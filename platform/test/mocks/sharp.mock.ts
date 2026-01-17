
module.exports = {
    resize: jest.fn().mockReturnThis(),
    grayscale: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
};
