//V14 version

export function registerAnimatedDoorSettings() {

    game.settings.register("dd-import-ad-v14", "animatedDoorPath", {
        name: "Animated door save path",
        hint: "Where should animated door assets be saved?",
        scope: "world",
        config: true,
        type: String,
        default: "assets"
    })

    game.settings.register("dd-import-ad-v14", "animatedWindows", {
        name: "Animated windows",
        hint: "If an animated window should behave as animated window or 'just' as a standard door",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    })

    game.settings.register("dd-import-ad-v14", "animatedDoorUseHashName", {
        name: "Save door assets with hash name",
        hint: "Determines if a door asset is uploaded and saved with it's door hash as part of the name. This is the safest way. If you choose to not do it a more readable name with informations added to the asset name is choosen.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    })
}

function DecodeImage(base64string) {
    //Use newer browser capabilities if present
    if (typeof Uint8Array.fromBase64 === "function") {
        return Uint8Array.fromBase64(base64string).buffer;
    }
    var byteString = atob(base64string); // converst each character to byte string, then decode base64 string
    var ab = new ArrayBuffer(byteString.length); // reserve array size to hold those bytes
    var ia = new Uint8Array(ab); // convert each character to byte array


    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i); // convert each character to byte array

    }
    return ab;
}


function getImageType(bytes) {
    let magic = bytes.substr(0, 4);
    if (magic == "\u0089PNG") {
        return 'png'
    } else if (magic == "RIFF") {
        return 'webp';
    } else if (magic == "\u00ff\u00d8\u00ff\u00e0") {
        return 'jpeg';
    }
    return 'png';
}

/*
file as decoded base64 and now binary string 
*/
async function uploadFile(file, name, path, source, extension) {
    let uploadFile = new File([file], name + "." + extension, { type: 'image/' + extension });
    console.log("File Object for upload:", uploadFile)
    console.log("Source: ", source)
    console.log("Path: ", path)
    // new FilePicker from version v14 and 14 (instead of ?? globalThis.FilePicker;)
    const filePicker = foundry.applications?.apps?.FilePicker?.implementation
    await filePicker.upload(source, path, uploadFile)
}

async function uploadSourceImage(content, importData, extension) {
    const buffer = DecodeImage(content.image);

    //    extension = getImageType(atob(content.image.substr(0, 8))); //gets the extension from the from the base64 string header

    console.log("Reclaimed Extension:", extension)
    //await uploadFile(buffer, content.name, importData.path, importData.source, extension, importData.bucket);
    await uploadFile(buffer, content.name, importData.path, importData.source, extension);
    return extension;
}

function getAnimatedAssetsList(file) {
    let animatedAssetsList = [];
    console.log("animated section:", file.animated_doors)
    console.log("animated list of assets:", file.animated_doors.assets) //need to be decoded and uploaded to be later used as textures

    {
        animatedAssetsList = Object.values(file.animated_doors.assets)
        console.log("Umgewandeltes asset object 1:", animatedAssetsList)
        if (animatedAssetsList.length === 0) return []
    }

    console.log("Umgewandeltes asset object 2:", animatedAssetsList)
    //Returns an array of Objects holding the assets
    return animatedAssetsList;
};


export async function uploadAnimatedDoorAssets(file, destinationInfo = {}) {

    file = file.filter(prop => prop.hasOwnProperty("animated_doors"));

    console.log("Reached upload 1!!")

    if (!file.length > 0) return

    console.log("Reached upload 2!!")


    console.log("v14 destination info", destinationInfo)
    const importData = {
        path: game.settings.get("dd-import-ad-v14", "animatedDoorPath") || "assets",
        source: destinationInfo.source,
    }


    console.log("Reached this!!")
    console.log("Files list passed on:", file)
    if (file.length > 0) {
        //for loop to get all levels later on OR AT LEAST to loop trough all and check if it is an animated asset level
        for (let i = 0; i < file.length; i++) {
            if (!file[i].animated_doors?.assets) continue; // check if an objekt is returned that holds an asset - even if that is empty

            const assetList = getAnimatedAssetsList(file[i])
            let content = {
                name: "DoorAsset." + Date.now(), //add a date
                image: ""
            }


            if (assetList.length > 0) {
                //Loop the door assets present in the UVTT 
                for (let j = 0; j < assetList.length; j++) {


                    const useHashName = game.settings.get("dd-import-ad-v14", "animatedDoorUseHashName") || true

                    content.image = assetList[j].image
                    const imageExtension = getImageType(atob(content.image.substr(0, 8)));
                    const uvvtExtension = assetList[j].format
                    const extension = uvvtExtension || imageExtension

                    const fallbackName = content.name

                    if (useHashName) {
                        content.name = assetList[j].naming?.asset_name + "_" + assetList[j].naming?.hash || fallbackName
                    } else {
                        content.name = assetList[j].naming?.ahort_filename || fallbackName
                    }

                    //We also should check if assets are allready uploaded to foundry at THIS step and skip the upload if that ist the case
                    await uploadSourceImage(content, importData, extension)
                    //}
                }
            }

            console.log("Final Animated Assets List", assetList)
            // Now collect the doors belonging to this asset - just for output reasons
            const doorList = getAnimatedDoorsList(file[i])
            console.log("Final Animated Doors List", doorList)
            //}
        }
    }

}

export function GetAnimatedDoors(file, scene, offset, pixelsPerGrid) {
    let doors = [];
    let ddDoors = file.portals;
    console.log("Start doors array", ddDoors)
    console.log("File Object START: ", file)
    if (file.hasOwnProperty("animated_doors")) //we have an uvtt which holds animated doors, use hasOwn if property can be null
    {
        const doorsToadd = getAnimatedDoorsList(file) //get all instances of animated doors

        console.log("doors to add", doorsToadd)
        if (doorsToadd.length > 0) {
            ddDoors = []
            ddDoors = file.portals.filter(door => door.animated !== true); // first step only add doors which are not animated
            ddDoors.push(...doorsToadd) //add the portals in the animated section
            console.log("End doors array", ddDoors)
        }
    }
    let sceneDimensions = scene.getDimensions()
    let offsetX = sceneDimensions.sceneX
    let offsetY = sceneDimensions.sceneY
    let originX = file.resolution.map_origin.x
    let originY = file.resolution.map_origin.y

    if (offset != 0) {
        //      ddDoors = this.makeOffsetWalls(ddDoors, offset) //what does this do?
    }
    console.log("doors array to iterate", ddDoors)
    for (let door of ddDoors) {
        try {
            if (door?.animated === false) {

                doors.push(new WallDocument({
                    c: [
                        ((door.bounds[0].x - originX) * pixelsPerGrid) + offsetX,
                        ((door.bounds[0].y - originY) * pixelsPerGrid) + offsetY,
                        ((door.bounds[1].x - originX) * pixelsPerGrid) + offsetX,
                        ((door.bounds[1].y - originY) * pixelsPerGrid) + offsetY
                    ],
                    door: game.settings.get("dd-import-ad-v14", "openableWindows") ? 1 : (door.closed ? 1 : 0), // If openable windows - all portals should be doors, otherwise, only portals that "block light" should be openable (doors)
                    light: door.closed ? CONST.EDGE_SENSE_TYPES.NORMAL : CONST.EDGE_SENSE_TYPES.PROXIMITY,
                    sight: door.closed ? CONST.EDGE_SENSE_TYPES.NORMAL : CONST.EDGE_SENSE_TYPES.PROXIMITY,
                    threshold: door.closed ? {} : { attenuation: true, light: 2, sight: 2 }
                }))


            } else {

                let hinge_index = 0
                let non_hinge_index = 1
                console.log("Single door object: ", door)
                console.log("hinge bound index", door.hasOwnProperty("hinge_bound_index"))
                let hinge_bound_index = 0;
                if (door.hasOwnProperty("hinge_bound_index")) {
                    hinge_index = door.hinge_bound_index ?? 0;
                    if (hinge_index === 1) {
                        non_hinge_index = 0
                    }
                }
                const foundryDoor = door.targets.foundry
                console.log("Door type is: ", foundryDoor.door_type)
                console.log("Door type result is: ", ((foundryDoor.door_type ?? -1) < 0) ? 1 : foundryDoor.door_type)
                console.log("Door type object is:", foundryDoor)
                // hinge offset needs to be added yet - probable best here and add it just as another parameter to the push 

                // get the prepared foundry settings
                const c = foundryDoor.c_grid
                console.log("Bounds array ", c)

                //check if we have a window and what kind
                //=================================================

                // create a Foundry standard wall
                //=================================
                let wallObject = {
                    c: [
                        ((c[0] - originX) * pixelsPerGrid) + offsetX,
                        ((c[1] - originY) * pixelsPerGrid) + offsetY,
                        ((c[2] - originX) * pixelsPerGrid) + offsetX,
                        ((c[3] - originY) * pixelsPerGrid) + offsetY
                    ],
                    animation: null, // If the door has animation, add it to the property else let it be null
                    door: 0,// 0 = wall, 1 = door, 2 = secret door 
                    ds: 0,// door state ==> ds: 0 = closed 1 = open
                    light: CONST.EDGE_SENSE_TYPES.NORMAL,
                    locked: false,
                    move: CONST.EDGE_SENSE_TYPES.NORMAL,
                    sight: CONST.EDGE_SENSE_TYPES.NORMAL,
                    sound: CONST.EDGE_SENSE_TYPES.NORMAL,
                    threshold: { attenuation: false, darkness: null, light: null, sight: null }
                }
                let isOpenableWindow = game.settings.get("dd-import-ad-v14", "openableWindows")
                let isAnimatedWindow = game.settings.get("dd-import-ad-v14", "animatedWindows")
                let isDoor = true
                if (foundryDoor.door_type === -1) {
                    isDoor = false // make sure it is not treated as a door
                    // create a standard window wall object like Foundry would
                    wallObject.light = CONST.EDGE_SENSE_TYPES.PROXIMITY
                    wallObject.sight = CONST.EDGE_SENSE_TYPES.PROXIMITY
                    wallObject.threshold = { attenuation: true, darkness: 2, light: 2, sight: 2 }
                }

                //now check if this should be handled as a door
                if (isOpenableWindow || isAnimatedWindow) {
                    wallObject.door = 1 // 0 = wall, 1 = door, 2 = secret door
                    wallObject.ds = foundryDoor.ds //door.closed ? 0 : 1 // door state ==> ds: 0 = closed 1 = open
                    wallObject.locked = foundryDoor.locked //door.closed ? door.locked : false
                }

                // and at last if it is an animated window
                if (isAnimatedWindow) {
                    wallObject.animation = getAnimationProperties(foundryDoor) ?? null
                }

                if (isDoor) {
                    wallObject.animation = getAnimationProperties(foundryDoor) ?? null // If the door has animation, add it to the property else let it be null
                    wallObject.door = foundryDoor.door_type //door.door_type // 0 = wall, 1 = door, 2 = secret door
                    wallObject.ds = foundryDoor.ds //door.closed ? 0 : 1 // door state ==> ds: 0 = closed 1 = open
                    wallObject.locked = foundryDoor.locked //door.closed ? door.locked : false
                    wallObject.threshold = foundryDoor.closed ? {} : { attenuation: true, darkness: 2, light: 2, sight: 2 }
                }

                doors.push(new WallDocument(wallObject))
                console.log("Doors Array which gets bigger", doors)
            }
        }
        catch (e) {
            console.error("Could not create animated Door Wall Document (animated door): " + e)
        }
    }
    return doors.filter(d => d)

}

function getAnimationProperties(door) {
    console.log("DOORANIMATION foundry door", door)
    if (!door.hasOwnProperty("animation")) return null;
    const doorAnimation = door.animation;
    console.log("DOORANIMATION door.animation", doorAnimation)

    const doorPath = game.settings.get("dd-import-ad-v14", "animatedDoorPath") || "assets"
    //const doorPath = "assets/" //"canvas/doors/large/" //needs to get a setting

    console.log("DOORANIMATION doorPath", doorPath)
    const useHashName = game.settings.get("dd-import-ad-v14", "animatedDoorUseHashName") || true
    let doorTexture = "/canvas/doors/large/Door_Metal_Gray_E1_1x1.webp"
    if (useHashName) {
        doorTexture = doorPath + "/" + doorAnimation.texture_hash + "." + doorAnimation.extension || doorTexture
    } else {
        doorTexture = doorPath + "/" + doorAnimation.texture + "." + doorAnimation.extension || doorTexture
    }

    // define a base animation
    let animation = {
        "type": doorAnimation.type || "swing",
        "double": doorAnimation.double || false,
        "direction": doorAnimation.direction || 1,
        "flip": doorAnimation.flip || false,
        "strength": doorAnimation.strength || 1,
        "duration": doorAnimation.duration || 750,
        "texture": doorTexture
    }

    console.log("Return of animation section for single door", animation)
    return animation
}

function getAnimatedDoorsList(file) {
    let animatedDoors = [];
    console.log("animated doors list:", file.animated_doors)
    console.log("animated doors assets:", file.animated_doors.assets) //need to be decoded and uploaded to be later used as textures
    console.log("animated doors instances:", file.animated_doors.instances) //this is a map with keys 1 to n


    if (file.animated_doors?.instances) //we have an uvtt which holds animated doors as instances, use hasOwn if property can be null
    {
        animatedDoors = Object.values(file.animated_doors.instances)
        console.log("Umgewandeltes object 1:", animatedDoors)
        if (animatedDoors.length === 0) return []
    }

    console.log("Umgewandeltes object 2:", animatedDoors)
    return animatedDoors;
};
