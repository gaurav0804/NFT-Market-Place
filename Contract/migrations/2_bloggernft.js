const BloggerNFT = artifacts.require("BloggerNFT");

module.exports = function (deployer) {
  deployer.deploy(BloggerNFT);
};
