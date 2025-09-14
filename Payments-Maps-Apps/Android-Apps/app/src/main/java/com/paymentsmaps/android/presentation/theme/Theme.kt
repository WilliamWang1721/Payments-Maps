package com.paymentsmaps.android.presentation.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

/**
 * Material 3 Expressive Light Color Scheme
 */
private val LightColorScheme = lightColorScheme(
    primary = ExpressivePrimary,
    onPrimary = ExpressiveOnPrimary,
    primaryContainer = ExpressivePrimaryContainer,
    onPrimaryContainer = ExpressiveOnPrimaryContainer,
    secondary = ExpressiveSecondary,
    onSecondary = ExpressiveOnSecondary,
    secondaryContainer = ExpressiveSecondaryContainer,
    onSecondaryContainer = ExpressiveOnSecondaryContainer,
    tertiary = ExpressiveTertiary,
    onTertiary = ExpressiveOnTertiary,
    tertiaryContainer = ExpressiveTertiaryContainer,
    onTertiaryContainer = ExpressiveOnTertiaryContainer,
    error = ExpressiveError,
    errorContainer = ExpressiveErrorContainer,
    onError = ExpressiveOnError,
    onErrorContainer = ExpressiveOnErrorContainer,
    background = ExpressiveBackground,
    onBackground = ExpressiveOnBackground,
    surface = ExpressiveSurface,
    onSurface = ExpressiveOnSurface,
    surfaceVariant = ExpressiveSurfaceVariant,
    onSurfaceVariant = ExpressiveOnSurfaceVariant,
    outline = ExpressiveOutline,
    inverseOnSurface = ExpressiveInverseOnSurface,
    inverseSurface = ExpressiveInverseSurface,
    inversePrimary = ExpressiveInversePrimary,
    surfaceTint = ExpressiveSurfaceTint,
    outlineVariant = ExpressiveOutlineVariant,
    scrim = ExpressiveScrim,
)

/**
 * Material 3 Expressive Dark Color Scheme
 */
private val DarkColorScheme = darkColorScheme(
    primary = ExpressiveDarkPrimary,
    onPrimary = ExpressiveDarkOnPrimary,
    primaryContainer = ExpressiveDarkPrimaryContainer,
    onPrimaryContainer = ExpressiveDarkOnPrimaryContainer,
    secondary = ExpressiveDarkSecondary,
    onSecondary = ExpressiveDarkOnSecondary,
    secondaryContainer = ExpressiveDarkSecondaryContainer,
    onSecondaryContainer = ExpressiveDarkOnSecondaryContainer,
    tertiary = ExpressiveDarkTertiary,
    onTertiary = ExpressiveDarkOnTertiary,
    tertiaryContainer = ExpressiveDarkTertiaryContainer,
    onTertiaryContainer = ExpressiveDarkOnTertiaryContainer,
    error = ExpressiveDarkError,
    errorContainer = ExpressiveDarkErrorContainer,
    onError = ExpressiveDarkOnError,
    onErrorContainer = ExpressiveDarkOnErrorContainer,
    background = ExpressiveDarkBackground,
    onBackground = ExpressiveDarkOnBackground,
    surface = ExpressiveDarkSurface,
    onSurface = ExpressiveDarkOnSurface,
    surfaceVariant = ExpressiveDarkSurfaceVariant,
    onSurfaceVariant = ExpressiveDarkOnSurfaceVariant,
    outline = ExpressiveDarkOutline,
    inverseOnSurface = ExpressiveDarkInverseOnSurface,
    inverseSurface = ExpressiveDarkInverseSurface,
    inversePrimary = ExpressiveDarkInversePrimary,
    surfaceTint = ExpressiveDarkSurfaceTint,
    outlineVariant = ExpressiveDarkOutlineVariant,
    scrim = ExpressiveDarkScrim,
)

/**
 * Payments Maps Material 3 Expressive Theme
 * Supports dynamic theming on Android 12+ and manual dark/light themes
 */
@Composable
fun PaymentsMapsTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ExpressiveTypography,
        shapes = ExpressiveShapes,
        content = content
    )
}