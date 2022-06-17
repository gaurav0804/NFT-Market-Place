// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BloggerNFT is Ownable, ERC721URIStorage {
  bool internal status;
  uint256 public totalSupply;
  
  event SupplyCount(uint256);
  struct auctionedSpace {
    string url;
    uint256 price;
    uint16 year;
    
  }  

  mapping (uint256 => auctionedSpace) public id_to_data;
  
  constructor() ERC721("BloggerNFT","BNFT"){

  }
  
  function mint_internal (string memory url, uint256 price, uint16 year) internal {
    
    _safeMint(msg.sender, totalSupply);
    _setTokenURI(totalSupply, url);
    
    id_to_data[totalSupply].url = url;
    id_to_data[totalSupply].price = price;
    id_to_data[totalSupply].year = year;
    
    totalSupply += 1;
  }

  function mint_external(string calldata url, uint256 price, uint16 year) external payable returns(uint256){
    require(msg.value == 100000000000000000 wei, "creating a contract costs 100000000000000000 wei");

    mint_internal(url, price, year);
    approve(owner(), totalSupply-1);

    payable(owner()).transfer(100000000000000000 wei); 

    emit SupplyCount(totalSupply-1);
    return totalSupply-1;
       
    }

  
  function getPrice(uint256 tokenId) public view returns(string memory,uint256,uint16){
    return (id_to_data[tokenId].url, id_to_data[tokenId].price,id_to_data[tokenId].year);
  }


    
  function sell_nft(uint256 tokenId, address buyer, uint256 price) external  {
    
    address seller = ownerOf(tokenId); 
    
    transferFrom(seller, buyer, tokenId);
    (bool success,) = seller.call{value: price}("");
    require(success,"Transfer fail");

    }

  function buy_nft(uint256 tokenId, uint256 newPrice) external payable{
    uint256 price = id_to_data[tokenId].price;
    id_to_data[tokenId].price = newPrice;

    require(msg.value >= price,"paid value is not equal to the price");

    (bool success,) = address(this).call{value: price,gas: 30000}("");
    require(success,"Transfer fail");

  }


  function getOwnerOf(uint256 tokenId) public view returns(address){

    return ownerOf(tokenId);
  }

  function getApproverOf(uint256 tokenId) public view returns(address){
    return getApproved(tokenId);
  }


  function getTotalSupply() public view returns(uint256){
    return totalSupply;
  }

  function setApproverForSale(uint256 tokenId) external {
    approve(owner(), tokenId);
  }

  fallback() external payable{

    status=false;
    
  }

  receive() external payable{
    status=true;
  }

  

  }



  

