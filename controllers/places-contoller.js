const { v4: uuidV4 } = require('uuid');
const mongoose = require('mongoose');
const fs = require('fs');
const { validationResult } = require('express-validator');
const HttpError = require("../models/http-error");
const getCoordinates = require('../util/location');

const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }
  let place;
  try {
   place = await Place.findById(placeId);

  } catch (e) {
    return next(new HttpError("Something went wrong, Could not retrieve place", 500));
  }
  if (!place) {
    return next(new HttpError('Could not find a place for the provided id.',404));
  }

  res.json({ place:place.toObject({getters:true})}); // => { place } => { place: place }
};

const getPlacesByUserId =async (req, res, next) => {
  const userId = req.params.uid;

  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (e) {
    return next( new HttpError('Something went wrong, fetching places faild.',500));
  }
  if (!userWithPlaces || userWithPlaces.length===0) {
    return next( new HttpError('Could not find a place for the provided user id.',404));
  }

  res.json({ places:userWithPlaces.places.map(place=>place.toObject({getters:true}))});
};

const createPlace =async  (req, res, next) => {

    const errors = validationResult(req);

    if(!errors.isEmpty()){
      return next(new HttpError("Invalid inputs passed, please check your data", 422)) ;
    }
 
  
    const { title, description, address } = req.body;
    let coordinates
      try {
      coordinates = await getCoordinates(address);
      } catch (e) {
        return next(e);
      }
     
  const createdPlace = new Place({
    title,
    description,
    address,
    location:coordinates,
    image:req.file.path,
    creator:req.userData.userId
  });
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (e) {
    return next(new HttpError("Creating place failed , plese try again later", 500));
  }
  if (!user) {
    return next(new HttpError("Could not find user for user id", 404));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (e) {
    const error = new HttpError('creating place failed', 500);
    console.log(e)
    return next(error);
  }
  res.status(201).json({createdPlace});
};



const updatePlace = async (req, res, next) => {

    const errors = validationResult(req);

    if(!errors.isEmpty()){
      return new HttpError("Invalid inputs passed, please check your data", 422);
    }

    const { title, description} = req.body;
    const placeId = req.params.pid;
    
    let place;
    try {
    place = await Place.findById(placeId);

    } catch (e) {
      return next(new HttpError("Something went wrong, Could not update place", 500));
    }
    if (place.creator.toString() !== req.userData.userId) {
        return next(new HttpError("You are not allowed to update this place.", 401));
    }
  
    place.title = title;
    place.description = description;
  try {
     await place.save();
  } catch (error) {
    return next(new HttpError("Something went wrong, Could not update place", 500));

  };
  
  res.status(200).json({ place:place.toObject({getters:true})});
    
};
 
const deletePlace =async (req, res, next) => {
  const placeId = req.params.pid;
    let place;
    try {
      place = await Place.findById(placeId).populate('creator');
    } catch (e) {
      return next(new HttpError("Something went wrong, Could not delete place", 500));
  }
  if (!place) {
    return next(new HttpError("Could not find place for given id", 404));

  }
  if (place.creator.id !== req.userData.userId) {
        return next(new HttpError("You are not allowed to delete this place.",  ));
  }
  const imagePath = place.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("Something went wrong, Could not delete place", 500));
  };
    fs.unlink(imagePath,err=>{
      console.log(err);
    })

  res.status(200).json({ message: "Place deleted" });
 };

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.deletePlace = deletePlace;
exports.updatePlace = updatePlace;

