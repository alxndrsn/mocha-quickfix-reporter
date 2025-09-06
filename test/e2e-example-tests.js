describe('example mocha suite with failures', () => {
  describe('simple failures', () => {
    it('should fail this one', () => {
      throw new Error('Direct failure.');
    });
  });

  describe('duplicate describe blocks', () => {
    describe('duplicate one', () => {
      it('should pass in the first block...', () => {
      });
    });
    describe('duplicate one', () => {
      it('...and fail in the second one', () => {
        throw new Error();
      });
    });

    describe('duplicate two', () => {
      it('should fail in the first block...', () => {
        throw new Error();
      });
    });
    describe('duplicate two', () => {
      it('...and pass in the second one', () => {
      });
    });
  });
});
