// Car Lister Firestore Interface
// This file will be expanded as we implement car listing functionality

window.firestore = {
    // Placeholder functions for car listing functionality
    getUserCars: async function(userId) {
        console.log('getUserCars called for user:', userId);
        return [];
    },
    
    addCar: async function(car) {
        console.log('addCar called with:', car);
        return null;
    },
    
    updateCar: async function(car) {
        console.log('updateCar called with:', car);
        return false;
    },
    
    deleteCar: async function(carId) {
        console.log('deleteCar called for:', carId);
        return false;
    },
    
    getAllCars: async function() {
        console.log('getAllCars called');
        return [];
    }
};

// Thumbnail carousel functionality
window.scrollToActiveThumbnail = function(activeIndex) {
    const thumbnailScroll = document.querySelector('.thumbnail-scroll');
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    const activeThumbnail = document.querySelector(`.thumbnail-wrapper:nth-child(${activeIndex + 1})`);
    
    if (thumbnailScroll && thumbnailContainer && activeThumbnail) {
        const scrollContainer = thumbnailScroll;
        const targetElement = activeThumbnail;
        
        // Calculate the scroll position to center the active thumbnail
        const containerWidth = scrollContainer.offsetWidth;
        const targetLeft = targetElement.offsetLeft;
        const targetWidth = targetElement.offsetWidth;
        const scrollLeft = targetLeft - (containerWidth / 2) + (targetWidth / 2);
        
        // Smooth scroll to the calculated position
        scrollContainer.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth'
        });
    }
};

// Fullscreen thumbnail carousel functionality (reuses same logic)
window.scrollToActiveFullscreenThumbnail = function(activeIndex) {
    const thumbnailScroll = document.querySelector('.fullscreen-thumbnails');
    const activeThumbnail = document.querySelector(`.fullscreen-thumbnail:nth-child(${activeIndex + 1})`);
    
    if (thumbnailScroll && activeThumbnail) {
        const scrollContainer = thumbnailScroll;
        const targetElement = activeThumbnail;
        
        // Calculate the scroll position to center the active thumbnail
        const containerWidth = scrollContainer.offsetWidth;
        const targetLeft = targetElement.offsetLeft;
        const targetWidth = targetElement.offsetWidth;
        const scrollLeft = targetLeft - (containerWidth / 2) + (targetWidth / 2);
        
        // Smooth scroll to the calculated position
        scrollContainer.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth'
        });
    }
};

// Fullscreen keyboard navigation
window.setupFullscreenKeyboard = function(dotNetRef, closeMethod, prevMethod, nextMethod) {
    // Remove any existing listeners
    if (window.fullscreenKeyHandler) {
        document.removeEventListener('keydown', window.fullscreenKeyHandler);
    }
    
    // Create new handler
    window.fullscreenKeyHandler = function(e) {
        const fullscreenOverlay = document.querySelector('.fullscreen-overlay');
        if (!fullscreenOverlay) return;
        
        switch(e.key) {
            case 'Escape':
                // Close fullscreen
                dotNetRef.invokeMethodAsync(closeMethod);
                break;
            case 'ArrowLeft':
                // Previous image
                dotNetRef.invokeMethodAsync(prevMethod);
                break;
            case 'ArrowRight':
                // Next image
                dotNetRef.invokeMethodAsync(nextMethod);
                break;
        }
    };
    
    // Add the event listener
    document.addEventListener('keydown', window.fullscreenKeyHandler);
};

// Cleanup function
window.cleanupFullscreenKeyboard = function() {
    if (window.fullscreenKeyHandler) {
        document.removeEventListener('keydown', window.fullscreenKeyHandler);
        window.fullscreenKeyHandler = null;
    }
}; 