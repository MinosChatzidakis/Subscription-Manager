export function handleAmenityToggle(amenity, setState) {
  setState((prev) => {
    const currentAmenities = Array.isArray(prev?.amenities)
      ? prev.amenities
      : [];
    if (currentAmenities.includes(amenity)) {
      return {
        ...prev,
        amenities: currentAmenities.filter((a) => a !== amenity),
      };
    }
    return {
      ...prev,
      amenities: [...currentAmenities, amenity],
    };
  });
}
