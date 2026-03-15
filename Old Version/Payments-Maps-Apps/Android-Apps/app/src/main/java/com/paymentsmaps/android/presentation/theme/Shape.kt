package com.paymentsmaps.android.presentation.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Material 3 Expressive Shape System
 * Enhanced with more expressive and dynamic corner radiuses
 */
val ExpressiveShapes = Shapes(
    // Extra Small - Subtle rounding for small components
    extraSmall = RoundedCornerShape(4.dp),
    
    // Small - Cards, chips, small buttons
    small = RoundedCornerShape(8.dp),
    
    // Medium - Standard cards, dialogs, medium buttons
    medium = RoundedCornerShape(12.dp),
    
    // Large - Large cards, bottom sheets, large buttons
    large = RoundedCornerShape(16.dp),
    
    // Extra Large - Hero components, full-screen dialogs
    extraLarge = RoundedCornerShape(28.dp)
)

/**
 * Extended Shape Definitions for Expressive Design
 */
object ExpressiveShapeTokens {
    
    // Minimal rounding
    val none = RoundedCornerShape(0.dp)
    val extraSmall = RoundedCornerShape(4.dp)
    val small = RoundedCornerShape(8.dp)
    
    // Standard rounding
    val medium = RoundedCornerShape(12.dp)
    val large = RoundedCornerShape(16.dp)
    val extraLarge = RoundedCornerShape(20.dp)
    
    // Expressive rounding
    val expressive = RoundedCornerShape(24.dp)
    val expressiveLarge = RoundedCornerShape(28.dp)
    val expressiveExtraLarge = RoundedCornerShape(32.dp)
    
    // Full rounding
    val full = RoundedCornerShape(50)
    
    // Asymmetric shapes for expressive design
    val asymmetricSmall = RoundedCornerShape(
        topStart = 4.dp,
        topEnd = 12.dp,
        bottomStart = 12.dp,
        bottomEnd = 4.dp
    )
    
    val asymmetricMedium = RoundedCornerShape(
        topStart = 8.dp,
        topEnd = 20.dp,
        bottomStart = 20.dp,
        bottomEnd = 8.dp
    )
    
    val asymmetricLarge = RoundedCornerShape(
        topStart = 12.dp,
        topEnd = 28.dp,
        bottomStart = 28.dp,
        bottomEnd = 12.dp
    )
    
    // Top-only rounding (for bottom sheets, cards)
    val topSmall = RoundedCornerShape(
        topStart = 8.dp,
        topEnd = 8.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp
    )
    
    val topMedium = RoundedCornerShape(
        topStart = 16.dp,
        topEnd = 16.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp
    )
    
    val topLarge = RoundedCornerShape(
        topStart = 24.dp,
        topEnd = 24.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp
    )
    
    // Bottom-only rounding (for top sheets, headers)
    val bottomSmall = RoundedCornerShape(
        topStart = 0.dp,
        topEnd = 0.dp,
        bottomStart = 8.dp,
        bottomEnd = 8.dp
    )
    
    val bottomMedium = RoundedCornerShape(
        topStart = 0.dp,
        topEnd = 0.dp,
        bottomStart = 16.dp,
        bottomEnd = 16.dp
    )
    
    val bottomLarge = RoundedCornerShape(
        topStart = 0.dp,
        topEnd = 0.dp,
        bottomStart = 24.dp,
        bottomEnd = 24.dp
    )
    
    // Component-specific shapes
    val button = RoundedCornerShape(20.dp)
    val buttonSmall = RoundedCornerShape(16.dp)
    val buttonLarge = RoundedCornerShape(24.dp)
    
    val card = RoundedCornerShape(12.dp)
    val cardLarge = RoundedCornerShape(16.dp)
    val cardExpressive = RoundedCornerShape(20.dp)
    
    val chip = RoundedCornerShape(8.dp)
    val chipLarge = RoundedCornerShape(12.dp)
    
    val dialog = RoundedCornerShape(24.dp)
    val bottomSheet = RoundedCornerShape(
        topStart = 24.dp,
        topEnd = 24.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp
    )
    
    val navigationBar = RoundedCornerShape(
        topStart = 16.dp,
        topEnd = 16.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp
    )
    
    val searchBar = RoundedCornerShape(28.dp)
    val textField = RoundedCornerShape(4.dp)
    val textFieldFilled = RoundedCornerShape(
        topStart = 4.dp,
        topEnd = 4.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp
    )
}