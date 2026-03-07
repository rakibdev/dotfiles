#define WLR_USE_UNSTABLE

#include <unistd.h>
#include <expected>

#include <hyprland/src/includes.hpp>
#include <hyprland/src/Compositor.hpp>
#include <hyprland/src/desktop/state/FocusState.hpp>
#include <hyprland/src/desktop/view/Window.hpp>
#include <hyprland/src/config/ConfigManager.hpp>
#include <hyprland/src/config/ConfigValue.hpp>
#include <hyprland/src/managers/input/InputManager.hpp>
#include <hyprland/src/plugins/PluginAPI.hpp>
#include <hyprland/src/layout/LayoutManager.hpp>

#define private public
#include <hyprland/src/layout/algorithm/tiled/scrolling/ScrollingAlgorithm.hpp>
#include <hyprland/src/layout/algorithm/tiled/scrolling/ScrollTapeController.hpp>
#undef private

#include <hyprutils/string/VarList2.hpp>
using namespace Hyprutils::String;
using namespace Layout::Tiled;
using namespace Layout;

inline CFunctionHook* g_pNewTargetHook = nullptr;
inline CFunctionHook* g_pLayoutMsgHook = nullptr;

void hkNewTarget(CScrollingAlgorithm* self, SP<ITarget> target) {
    auto droppingOn = Desktop::focusState()->window();

    if (droppingOn && droppingOn->layoutTarget() == target)
        droppingOn = g_pCompositor->vectorToWindowUnified(g_pInputManager->getMouseCoordsInternal(),
                                                          Desktop::View::RESERVED_EXTENTS | Desktop::View::INPUT_EXTENTS);

    SP<SScrollingTargetData> droppingData   = droppingOn ? self->dataFor(droppingOn->layoutTarget()) : nullptr;
    SP<SColumnData>          droppingColumn = droppingData ? droppingData->column.lock() : nullptr;

    if (!droppingColumn) {
        auto col = self->m_scrollingData->add();
        col->add(target);
        self->m_scrollingData->fitCol(col);
    } else {
        if (g_layoutManager->dragController()->wasDraggingWindow() && g_layoutManager->dragController()->draggingTiled()) {
            const auto MOUSE_X = g_pInputManager->getMouseCoordsInternal().x;
            const auto DROP_X  = droppingOn->getWindowIdealBoundingBoxIgnoreReserved().middle().x;
            const auto IS_LEFT = MOUSE_X < DROP_X;
            const auto COL_IDX = self->m_scrollingData->idx(droppingColumn);

            if (IS_LEFT) {
                const auto NEW_COL = COL_IDX == -1 ? self->m_scrollingData->add() : self->m_scrollingData->add(COL_IDX - 1);
                NEW_COL->add(target);
                self->m_scrollingData->fitCol(NEW_COL);
            } else {
                const auto NEW_COL = COL_IDX == -1 ? self->m_scrollingData->add() : self->m_scrollingData->add(COL_IDX);
                NEW_COL->add(target);
                self->m_scrollingData->fitCol(NEW_COL);
            }
        } else {
            auto idx = self->m_scrollingData->idx(droppingColumn);
            auto col = idx == -1 ? self->m_scrollingData->add() : self->m_scrollingData->add(idx);
            col->add(target);
            self->m_scrollingData->fitCol(col);
        }
    }

    self->m_scrollingData->recalculate();
}

std::expected<void, std::string> hkLayoutMsg(CScrollingAlgorithm* self, const std::string_view& sv) {
    const auto ARGS = CVarList(std::string{sv}, 0, ' ');

    if (ARGS[0] == "move" && (ARGS[1] == "+col" || ARGS[1] == "col")) {
        const auto TDATA = self->dataFor(Desktop::focusState()->window() ? Desktop::focusState()->window()->layoutTarget() : nullptr);
        if (!TDATA)
            return std::unexpected("no window");

        const auto COL = self->m_scrollingData->next(TDATA->column.lock());
        if (!COL) {
            const auto   USABLE        = self->usableArea();
            const bool   isHoriz       = self->m_scrollingData->controller->isPrimaryHorizontal();
            const double usablePrimary = isHoriz ? USABLE.w : USABLE.h;
            const double maxOffset     = std::max(0.0, self->m_scrollingData->maxWidth() - usablePrimary);
            self->m_scrollingData->controller->setOffset(maxOffset);
            self->m_scrollingData->centerOrFitCol(TDATA->column.lock());
            self->m_scrollingData->recalculate();
            self->focusTargetUpdate(nullptr);
            return {};
        }
    }

    using origFn = std::expected<void, std::string> (*)(CScrollingAlgorithm*, const std::string_view&);
    return (*(origFn)g_pLayoutMsgHook->m_original)(self, sv);
}

APICALL EXPORT std::string PLUGIN_API_VERSION() {
    return HYPRLAND_API_VERSION;
}

APICALL EXPORT PLUGIN_DESCRIPTION_INFO PLUGIN_INIT(HANDLE handle) {
    const std::string HASH        = __hyprland_api_get_hash();
    const std::string CLIENT_HASH = __hyprland_api_get_client_hash();

    if (HASH != CLIENT_HASH) {
        HyprlandAPI::addNotification(handle, "[hs] version mismatch", CHyprColor{1.0, 0.2, 0.2, 1.0}, 5000);
        throw std::runtime_error("[hs] version mismatch");
    }

    auto hookFn = [&](const std::string& name, void* replacement, CFunctionHook*& hook) {
        auto  matches = HyprlandAPI::findFunctionsByName(handle, name);
        void* addr    = nullptr;
        for (auto& m : matches) {
            if (m.demangled.contains("CScrollingAlgorithm")) {
                addr = m.address;
                break;
            }
        }
        if (!addr) {
            HyprlandAPI::addNotification(handle, "[hs] symbol not found: " + name, CHyprColor{1.0, 0.2, 0.2, 1.0}, 5000);
            throw std::runtime_error("[hs] symbol not found: " + name);
        }
        hook = HyprlandAPI::createFunctionHook(handle, addr, replacement);
        hook->hook();
    };

    hookFn("newTarget", (void*)hkNewTarget, g_pNewTargetHook);
    hookFn("layoutMsg",  (void*)hkLayoutMsg,  g_pLayoutMsgHook);

    HyprlandAPI::addNotification(handle, "[hs] loaded", CHyprColor{0.2, 1.0, 0.2, 1.0}, 5000);

    return {"hyprland-scrolling", "Patches for Hyprland core scrolling layout", "rakibdev", "1.0"};
}

APICALL EXPORT void PLUGIN_EXIT() {
    if (g_pNewTargetHook)
        g_pNewTargetHook->unhook();
    if (g_pLayoutMsgHook)
        g_pLayoutMsgHook->unhook();
}
