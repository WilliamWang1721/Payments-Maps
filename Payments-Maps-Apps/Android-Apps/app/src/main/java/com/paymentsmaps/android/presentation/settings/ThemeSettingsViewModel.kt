package com.paymentsmaps.android.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.data.preferences.UserPreferencesManager
import com.paymentsmaps.android.domain.model.ThemeMode
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 主题设置 UI 状态
 */
data class ThemeSettingsUiState(
    val themeMode: ThemeMode = ThemeMode.SYSTEM
)

/**
 * 主题设置 ViewModel
 */
@HiltViewModel
class ThemeSettingsViewModel @Inject constructor(
    private val userPreferencesManager: UserPreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ThemeSettingsUiState())
    val uiState: StateFlow<ThemeSettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            userPreferencesManager.themeModeFlow.collect { mode ->
                _uiState.value = ThemeSettingsUiState(mode.toThemeMode())
            }
        }
    }

    fun updateTheme(mode: ThemeMode) {
        viewModelScope.launch {
            userPreferencesManager.saveThemeMode(
                when (mode) {
                    ThemeMode.DARK -> "dark"
                    ThemeMode.LIGHT -> "light"
                    ThemeMode.SYSTEM -> "system"
                }
            )
        }
    }

    private fun String.toThemeMode(): ThemeMode {
        return when (this.lowercase()) {
            "dark" -> ThemeMode.DARK
            "light" -> ThemeMode.LIGHT
            else -> ThemeMode.SYSTEM
        }
    }
}
