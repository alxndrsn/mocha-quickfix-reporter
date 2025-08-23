describe('example mocha suite with failures', () => {
  describe('simple failures', () => {
    it('should fail this one', () => {
      throw new Error('Direct failure.');
    });
  });
});
