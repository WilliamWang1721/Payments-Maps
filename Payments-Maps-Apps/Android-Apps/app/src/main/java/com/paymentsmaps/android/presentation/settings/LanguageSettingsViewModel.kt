package com.paymentsmaps.android.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.paymentsmaps.android.data.preferences.UserPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 语言设置 UI 状态
 */
data class LanguageSettingsUiState(
    val language: String = "zh-CN",
    val currency: String = "CNY"
)

/**
 * 语言设置 ViewModel
 */
@HiltViewModel
class LanguageSettingsViewModel @Inject constructor(
    private val userPreferencesManager: UserPreferencesManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(LanguageSettingsUiState())
    val uiState: StateFlow<LanguageSettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            userPreferencesManager.languageFlow.collect { language ->
                _uiState.value = _uiState.value.copy(language = language)
            }
        }
        viewModelScope.launch {
            userPreferencesManager.currencyFlow.collect { currency ->
                _uiState.value = _uiState.value.copy(currency = currency)
            }
        }
    }

    fun updateLanguage(language: String) {
        viewModelScope.launch {
            userPreferencesManager.saveLanguage(language)
        }
    }

    fun updateCurrency(currency: String) {
        viewModelScope.launch {
            userPreferencesManager.saveCurrency(currency)
        }
    }
}
